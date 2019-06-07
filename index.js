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
            .input('id', sql.Int, utils.escapeHTML(id))
            .query(
                'SELECT id, title, author, metaTags, coverImage, body, time_stamp \
                FROM dbo.article WHERE id = @id'
            );
        pool.close();
        sql.close();

        // Clean up / format DB result for JSON output and return result
        let article = result.recordset[0];
        article.body = JSON.parse(article.body);
        article.metaTags = JSON.parse(article.metaTags);
        article.coverImage = JSON.parse(article.coverImage);
        return JSON.stringify(article);
    } catch(e){return false;}
}

// Insert new article into DB
async function dbInsertArticle(article){
    try{
        // Connect to DB and set up prepared statement query
        // Insert a row into article table, then close connection
        let pool = await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), utils.escapeHTML(article.title))
            .input('author', sql.VarChar(64), utils.escapeHTML(article.author))
            .input('metaTags', sql.VarChar(512), utils.escapeHTML(JSON.stringify(article.metaTags)))
            .input('coverImage', sql.VarChar(1024), utils.escapeHTML(JSON.stringify(article.coverImage)))
            .input('body', sql.VarChar(8000), utils.escapeHTML(JSON.stringify(article.body)))
            .query(
                'INSERT INTO dbo.article (title, author, metaTags, coverImage, body) \
                VALUES(@title, @author, @metaTags, @coverImage, @body)'
            );
        pool.close();
        sql.close();

        return result.rowsAffected == 1 ? true : false;
    } catch(e){return false;}
}
