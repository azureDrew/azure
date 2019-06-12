let fs = require('fs');
let ejs = require('ejs');
let sql = require('mssql');
let utils = require('./utils');

module.exports = async function (context, req){
    let body = "";
    
    // If client is requesting a webpage with article
    if(req.query.article) 
        body = ejs.render( 
            fs.readFileSync(__dirname + "/article.ejs", 'utf-8'),
            {articleJson: await dbSelectArticle(req.query.article.trim())}
        );

    // If client is requesting an article
    else if(req.query.getArticle)
        body = await dbSelectArticle(req.query.getArticle.trim());

    // If client is posting an article
    else if(req.query.postArticle)
        body = await dbInsertArticle(JSON.parse(req.query.postArticle).trim());

    // If client is lost
    else body = false; // Replace with redirect to error.html once made

    context.res = {
        status: 200,
        body: body,
        headers: {'Content-Type': 'text/html'}
    };
    context.done();
};

// Get an article from DB by a given id
async function dbSelectArticle(title){
    try{
        // Connect to DB and set up prepared statement query
        // Select a specific row from article table by id, then close connection
        let pool = await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), utils.escapeHTML(title))
            .query(
                'SELECT title, author, coverImage, body, time_stamp \
                FROM dbo.article WHERE title = @title; \
                SELECT tag FROM articleTag WHERE articleTitle = @title;'
            );
        pool.close();
        sql.close();

        // Clean up / format DB result for JSON output and return result
        let article = result.recordsets[0][0];
        article.body = JSON.parse(article.body);
        article.metaTags = result.recordsets[1];
        article.coverImage = JSON.parse(article.coverImage);
        return utils.escapeHTML(JSON.stringify(article));
    } catch(e){return false;}
}

// Insert new article into DB
// Insert all associated articleTags into DB
async function dbInsertArticle(article){
    let maxTitleLen = 128;
    let maxAuthorLen = 64;
    let maxImageLen = 1024;
    let maxBodyLen = 8000;
    let maxTagLen = 24;
    let maxNumOfTags = 5;

    try{
        // Connect to DB and set up prepared statement query
        // Insert row into article DB table for new article
        let pool = await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), utils.escapeHTML(article.title))
            .input('author', sql.VarChar(maxAuthorLen), utils.escapeHTML(article.author))
            .input('coverImage', sql.VarChar(maxImageLen), utils.escapeHTML(JSON.stringify(article.coverImage)))
            .input('body', sql.VarChar(maxBodyLen), utils.escapeHTML(JSON.stringify(article.body)));
        let batchInput = 'INSERT INTO dbo.article (title, author, coverImage, body) \
            VALUES(@title, @author, @coverImage, @body) ';

        // For each articleTag, insert row into articleTag table
        // Only insert first maxNumOfTags tags and only if they are <= maxTagLen chars
        for(a = 0; a < article.metaTags.length && a < maxNumOfTags; a++){
            if(article.metaTags[a].length <= maxTagLen){
                batchInput += ' INSERT INTO dbo.articleTag (articleTitle, tag) \
                    VALUES(@articleTitle' + a + ', @tag' + a + '); ';
                result = result
                    .input('articleTitle' + a, sql.VarChar(maxTitleLen), utils.escapeHTML(article.title))
                    .input('tag' + a, sql.VarChar(maxTagLen), utils.escapeHTML(article.metaTags[a]));
            }
        }
        
        // Execute query, close connections, return outcome
        result = await result.query(batchInput);
        pool.close();
        sql.close();
        return result.rowsAffected > 0 ? true : false;
    } catch(e){return false;}
}
