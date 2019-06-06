let fs = require('fs');
let ejs = require('ejs');
let sql = require('mssql');
let utils = require('./utils');

module.exports = async function (context, req){

    // Expected input: int
    if(req.query.article){
        // Get article by id from DB
        let articleJson = await dbSelectArticleById(req.query.article.trim());

        // If article SELECT caused error, return error message
        // Else, render article page with json obtained from SELECT
        context.res = {
            status: 200,
            body: ejs.render( 
                fs.readFileSync(__dirname + "/article.ejs", 'utf-8'),
                {articleJson: articleJson}
            ),
            headers: {'Content-Type': 'text/html'}
        };
        context.done();

    // Expected input: int
    } else if(req.query.getArticle){

        // Get article by id from DB and return it to client
        let articleJson = await dbSelectArticleById(req.query.getArticle.trim());
        context.res = {
            status: 200,
            body: articleJson,
            headers: {'Content-Type': 'text/html'}
        };
        context.done();

    // Expected input: json article obj
    } else if(req.query.postArticle){
        // Insert new article into DB
        let insertArticle = await dbInsertArticle(req.query.postArticle.trim());
        context.res = {
            status: 200,
            body: insertArticle,
            headers: {'Content-Type': 'text/html'}
        };
        context.done();
    }
};

// Get an article from the DB by a given id
async function dbSelectArticleById(id){
    try{
        // Connect to DB
        let pool = await sql.connect({
            user: utils.user,
            password: utils.password,
            server: utils.server,
            database: utils.database,
            options: {encrypt: true}
        });
        
        // Set up prepared statement query
        // Select a specific row from the article table by id
        let result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, title, author, metaTags, coverImage, body, time_stamp FROM dbo.article WHERE id = @id');
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
        // Connect to DB
        let pool = await sql.connect({
            user: utils.user,
            password: utils.password,
            server: utils.server,
            database: utils.database,
            options: {encrypt: true}
        });

        // Set up prepared statement query
        // Insert a row into the article table
        let result = await pool.request()
            .input('title', sql.VarChar(128), article.title)
            .input('author', sql.VarChar(64), article.author)
            .input('metaTags', sql.VarChar(512), JSON.stringify(article.metaTags))
            .input('coverImage', sql.VarChar(1024), JSON.stringify(article.coverImage))
            .input('body', sql.VarChar(8000), JSON.stringify(article.body))
            .query('INSERT INTO dbo.article (title, author, metaTags, coverImage, body) VALUES(@title, @author, @metaTags, @coverImage, @body)');
        pool.close();
        sql.close();

        return result.rowsAffected == 1 ? true : false;
    } catch(e){return false;}
}
