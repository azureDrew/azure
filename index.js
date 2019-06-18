let fs = require('fs');
let ejs = require('ejs');
let sql = require('mssql');
let utils = require('./utils');
let pool;

module.exports = async function (context, req){
    let body = "";
    req = req.query;
    
    // If client is requesting webpage with article
    if(req.article) 
        body = ejs.render(
            fs.readFileSync(__dirname + "/article.ejs", 'utf-8'), {
                article: await dbSelectArticle(req.article, req.previousArticleViewedId),
                articleRecommendations: await dbSelectArticleRecommendations(req.article)
            }
        );

    // If client is requesting article
    else if(req.getArticle)
        body = await dbSelectArticle(req.getArticle, req.previousArticleViewedId);

    // If client is posting article
    else if(req.postArticle)
        body = await dbInsertArticle(JSON.parse(req.postArticle));

    // If client is lost
    else body = false; // Replace with redirect to error.html once made

    context.res = {
        status: 200,
        body: body,
        headers: {'Content-Type': 'text/html'}
    };
    context.done();
};

// Get article from DB by given title
// input: string, string
async function dbSelectArticle(title, previousArticleViewedId){
    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select row from article table by title and all tags associated with it
        // Insert row into articleView table to log traffic, then output id for row
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), title)
            .input('previousArticleViewedId', sql.Int, previousArticleViewedId)
            .query(
                'SELECT title, author, coverImage, body, time_stamp \
                    FROM dbo.article WHERE title = @title; \
                SELECT tag FROM articleTag WHERE articleTitle = @title; \
                INSERT into dbo.articleView (articleTitle, previousArticleViewedId) \
                    VALUES(@title, @previousArticleViewedId) \
                SELECT SCOPE_IDENTITY();'
            );

        // Clean up / format DB result to make coherent object, then return result
        let article = result.recordsets[0][0];
        article.body = JSON.parse(article.body);
        article.tags = result.recordsets[1];
        article.coverImage = JSON.parse(article.coverImage);
        article.articleChainViewedHead = Object.values(result.recordsets[2][0])[0];
        return JSON.stringify(article);
    } catch(e){return false;}
}

// Dumby function for testing front end recommendations system
async function dbSelectArticleRecommendations(title){
    return JSON.stringify([
        {title: "hey", coverImage: {
            url: "https://spectrum.ieee.org/image/MzMwOTQ1NA.jpeg",
            description: "<#this is an image probably#>"
        }},
        {title: "bey", coverImage: {
            url: "https://spectrum.ieee.org/image/MzMwOTQ1NA.jpeg",
            description: "<#this is an image probably#>"
        }},
        {title: "crey", coverImage: {
            url: "https://spectrum.ieee.org/image/MzMwOTQ1NA.jpeg",
            description: "<#this is an image probably#>"
        }}
    ]);
}

// Insert new article into DB
// Insert all associated articleTags into DB
// input: {
//    title: string,
//    author: string,
//    tags: [string, ...],
//    coverImage: {url: string, description: string},
//    body: [string, {url: string, description: string}, ...]
// }
async function dbInsertArticle(article){
    let maxTitleLen = 128;
    let maxAuthorLen = 64;
    let maxImageLen = 1024;
    let maxBodyLen = 8000;
    let maxTagLen = 24;
    let maxNumOfTags = 5;

    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Insert row into article DB table for new article
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), article.title)
            .input('author', sql.VarChar(maxAuthorLen), article.author)
            .input('coverImage', sql.VarChar(maxImageLen), JSON.stringify(article.coverImage))
            .input('body', sql.VarChar(maxBodyLen), JSON.stringify(article.body));
        let batchInput = 'INSERT INTO dbo.article (title, author, coverImage, body) \
            VALUES(@title, @author, @coverImage, @body) ';
        
        // For each articleTag, insert row into articleTag table
        // Only insert first maxNumOfTags tags and only if article insert was successful
        batchInput += ' IF @@ROWCOUNT = 1 BEGIN ';
        for(a = 0; a < article.tags.length && a < maxNumOfTags; a++){ 
            batchInput += ' INSERT INTO dbo.articleTag (articleTitle, tag) \
                VALUES(@articleTitle' + a + ', @tag' + a + '); ';
            result = result
                .input('articleTitle' + a, sql.VarChar(maxTitleLen), article.title)
                .input('tag' + a, sql.VarChar(maxTagLen), article.tags[a]);
        }
        batchInput += ' END ';
        
        // Execute query and return outcome
        return (await result.query(batchInput)).rowsAffected[0] == 1 ? true : false;
    } catch(e){return false;}
}
