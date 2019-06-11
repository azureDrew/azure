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
            {articleJson: await dbSelectArticleById(req.query.article.trim())}
        );

    // If client is requesting an article
    else if(req.query.getArticle)
        body = await dbSelectArticleById(req.query.getArticle.trim());

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
async function dbSelectArticleById(id){
    try{
        // Connect to DB and set up prepared statement query
        // Select a specific row from article table by id, then close connection
        let pool = await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), utils.escapeHTML(id))

            // re-write query to use new articlTag table, and get rid of "metaTag"
            .query(
                'SELECT title, author, metaTags, coverImage, body, time_stamp \
                FROM dbo.article WHERE title = @title'
            );
        pool.close();
        sql.close();

        // Clean up / format DB result for JSON output and return result
        let article = result.recordset[0];
        article.body = JSON.parse(article.body);
        article.metaTags = JSON.parse(article.metaTags);
        article.coverImage = JSON.parse(article.coverImage);
        return utils.escapeHTML(JSON.stringify(article));
    } catch(e){return false;}
}

// Insert new article into DB
// Insert all associated articleTags into DB
async function dbInsertArticle(article){
    try{
        // Connect to DB and set up prepared statement query
        // Insert row into article DB table for new article
        let pool = await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), utils.escapeHTML(article.title))
            .input('author', sql.VarChar(64), utils.escapeHTML(article.author))
            .input('metaTags', sql.VarChar(512), utils.escapeHTML(JSON.stringify(article.metaTags)))
            .input('coverImage', sql.VarChar(1024), utils.escapeHTML(JSON.stringify(article.coverImage)))
            .input('body', sql.VarChar(8000), utils.escapeHTML(JSON.stringify(article.body)));
        let batchInput = 'INSERT INTO dbo.article (title, author, metaTags, coverImage, body) \
            VALUES(@title, @author, @metaTags, @coverImage, @body) ';

        // For each articleTag, insert row into articleTag table
        // Only insert first 5 tags and only if they are less than 24 chars
        for(a = 0; a < article.metaTags.length && a < 5; a++){
            if(article.metaTags[a].length <= 24){
                batchInput += ' INSERT INTO dbo.articleTag (articleTitle, tag) \
                    VALUES(@articleTitle' + a + ', @tag' + a + '); ';
                result = result.input('articleTitle' + a, sql.VarChar(128), utils.escapeHTML(article.title))
                    .input('tag' + a, sql.VarChar(24), utils.escapeHTML(article.metaTags[a]));
            }
        }
        result = await result.query(batchInput);

        pool.close();
        sql.close();
        return result.rowsAffected > 0 ? true : false;;
    } catch(e){return false;}
}
