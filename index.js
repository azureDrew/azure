let fs = require('fs');
let ejs = require('ejs');
let sql = require('mssql');
let utils = require('./utils');
let pool;

module.exports = async function(context, req){
    let body = "";
    req = req.query;
    
    // If client is requesting webpage with article
    if(req.article) 
        body = ejs.render(
            fs.readFileSync(__dirname + "/article.ejs", 'utf-8'), {
                article: await dbSelectArticle(req.article, req.previousPage),
                articleRecommendations: await dbSelectArticleRecommendations(req.article)
            }
        );

    // If client is requesting article
    else if(req.getArticle)
        body = await dbSelectArticle(req.getArticle, req.previousPage);

    // If client is posting article
    else if(req.postArticle)
        body = await dbInsertArticle(utils.testArticle);
        //body = await dbInsertArticle(JSON.parse(req.postArticle));

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
async function dbSelectArticle(title, previousPage){
    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select row from article table by title and all tags associated with it
        // Insert row into articleView table to log traffic, then output id for row
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), title)
            .input('previousPage', sql.VarChar(256), previousPage)
            .query(
                'SELECT title, author, coverImage, body, time_stamp \
                    FROM dbo.article WHERE title = @title; \
                SELECT tag FROM articleTag WHERE articleTitle = @title; \
                INSERT into dbo.articleViewed (articleTitle, previousPage) \
                    VALUES(@title, @previousPage) \
                SELECT SCOPE_IDENTITY();'
            );

        // Clean up / format DB result to make coherent object, then return result
        let article = result.recordsets[0][0];
        article.body = JSON.parse(article.body);
        article.tags = result.recordsets[1];
        article.coverImage = JSON.parse(article.coverImage);
        //article.previousArticleViewedId = Object.values(result.recordsets[2][0])[0];
        return JSON.stringify(article);
    } catch(e){return false;}
}

// Get recommended articles similar to input article
// input: string
async function dbSelectArticleRecommendations(title){
    let maxAge = 1000000; // micoseconds

    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select most recent row in articleRecommendations table for given article
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(128), title)
            .query(
                'SELECT TOP (1) recommendations, time_stamp FROM dbo.articleRecommendations \
                WHERE articleTitle = @title ORDER BY id DESC;'
            );
        
        // If article does not have recommendations associated with it 
        // or its recommendations have not been updated recently, 
        // update its recommendations, then return result
        if(result.recordsets[0].length == 0){
            updateArticleRecs(title);
            return false;
        } else {
            let currentTime = (new Date).getTime();
            let lastUpdate = (new Date(result.recordsets[0][0].time_stamp)).getTime();
            if(currentTime - lastUpdate > maxAge) updateArticleRecommendations(title);
            return result.recordsets[0][0].recommendations;
        }
    } catch(e){return e;}
}

// Update the recommendations associated with a given article
async function updateArticleRecommendations(title){
    return true;
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

// Create filter for article which is later used to determin similarity to other articles
async function buildFilter(article){
    return true;
}
