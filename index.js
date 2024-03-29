let fs = require('fs');
let ejs = require('ejs');
let sql = require('mssql');
let utils = require('./utils');
let bf = require('bloomfilter');

let pool;
let hashCount = 4;
let maxTagLen = 24;
let filterSize = 32;
let maxNumOfTags = 5;
let maxImgLen = 1024;
let maxBodyLen = 8000;
let maxTitleLen = 128;
let maxAuthorLen = 64;
let maxPreviousPageLen = 256;
let maxRecommendationsLen = 1024;
let maxRecommendationsAge = 1000000; // microseconds

module.exports = async function(context, req){
    reqGet = req.query || {};
    reqPost = req.body || {};
    
    // If client is requesting webpage with article
    if(reqGet.article) 
        var body = ejs.render(
            fs.readFileSync(__dirname + "/article.ejs", 'utf-8'), {
                article: JSON.stringify(
                    await dbSelectArticle(reqGet.article, reqGet.previousPage)
                ), articleRecommendations: JSON.stringify(
                    await dbSelectArticleRecommendations(reqGet.article)
                )
            }
        );

    // If client is requesting article
    else if(reqGet.getArticle)
        var body = JSON.stringify({
            article: await dbSelectArticle(reqGet.getArticle, reqGet.previousPage), 
            articleRecommendations: await dbSelectArticleRecommendations(reqGet.getArticle)
        });

    // If client is posting article
    else if(reqPost.postArticle)
        var body = await dbInsertArticle(JSON.parse(reqPost.postArticle));

    // If client is lost
    else var body = false; // Replace with redirect to error.html once made

    context.res = {
        status: 200,
        body: body,
        headers: {'Content-Type': 'text/html'}
    };
    context.done();
};

/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// Article Transactions ////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

// Get article from DB by given title and log traffic
// input: string, string
async function dbSelectArticle(title, previousPage){
    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select row from article table by title and all tags associated with it
        // Insert row into articleView table to log traffic
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .input('previousPage', sql.VarChar(maxPreviousPageLen), previousPage)
            .query(
                'SELECT title, author, coverImage, body, time_stamp \
                    FROM article WHERE title = @title; \
                SELECT tag FROM articleTag WHERE articleTitle = @title; \
                INSERT into articleViewed (articleTitle, previousPage) \
                    VALUES(@title, @previousPage)'
            );

        // Clean up / format DB result to make coherent object, then return result
        let article = result.recordsets[0][0];
        article.body = JSON.parse(article.body);
        article.tags = result.recordsets[1];
        article.coverImage = JSON.parse(article.coverImage);
        return article;
    } catch(e){return false;}
}

// Insert new article into DB
// Insert all associated articleTags into DB
// input: {
//    title: string,
//    author: string,
//    tags: string,
//    body: string,
//    coverImageUrl: string,
//    coverImageDescription: string
// }
async function dbInsertArticle(article){
    try{
        // Format article tags into array
        let tags = article.tags.split(',').map(t => t.trim());

        // Format article cover image into object
        let coverImage = {
            url: article.coverImageUrl.trim(),
            description: article.coverImageDescription.trim()
        };

        // Format article body into array of strings and/or image objects
        while(article.body.includes('\n\n\n')) // Need to make this line not dumb...
            article.body = article.body.split('\n\n\n').join('\n\n');
        let body = article.body.split('\n\n').map(section => {
            return section.substring(0, 5) == 'url: ' ? {
                url: section.split('\n')[0].replace('url: ', '').trim(), 
                description: section.split('\n')[1].replace('description: ', '').trim()
            } : section.trim();
        });

        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Insert row into article DB table for new article
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), article.title.trim())
            .input('author', sql.VarChar(maxAuthorLen), article.author.trim())
            .input('coverImage', sql.VarChar(maxImgLen), JSON.stringify(coverImage))
            .input('body', sql.VarChar(maxBodyLen), JSON.stringify(body));
        let batchInput = 'INSERT INTO article (title, author, coverImage, body) \
            VALUES(@title, @author, @coverImage, @body) ';
        
        // For each articleTag, insert row into articleTag table
        // Only insert first maxNumOfTags tags and only if article insert was successful
        batchInput += ' IF @@ROWCOUNT = 1 BEGIN ';
        for(a = 0; a < tags.length && a < maxNumOfTags; a++){ 
            result = result
                .input('articleTitle' + a, sql.VarChar(maxTitleLen), article.title)
                .input('tag' + a, sql.VarChar(maxTagLen), tags[a]);
            batchInput += ' INSERT INTO articleTag (articleTitle, tag) \
                VALUES(@articleTitle' + a + ', @tag' + a + '); ';
        }
        batchInput += ' END ';
        
        // Execute query and return outcome
        return (await result.query(batchInput)).rowsAffected[0] == 1 ? true : false;
    } catch(e){return false;}
}

/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Recommendations Functionality //////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

// Create (4 hash, 32 bit) bloom filter for article as 32 bit int
// Use article tags to determin set membership
// Update article table row with given title with new filter
// input: string
async function dbUpdateArticleFilter(title){
    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select tags of given article
        pool = pool || await sql.connect(utils.connectionObj);
        result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .query('SELECT TOP (5) tag FROM articleTag WHERE articleTitle = @title;');
        let tags = result.recordsets[0].map(obj => obj.tag);

        // Create bloom filter based on article tags
        let bloom = new bf.BloomFilter(filterSize, hashCount);
        for(a = 0; a < tags.length && a < maxNumOfTags; a++)
            bloom.add(tags[a]);
        let filter = [].slice.call(bloom.buckets)[0];

        // Update article row with created filter and return filter
        result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .input('bloomFilter', sql.Int, filter)
            .query('UPDATE article SET bloomFilter = @bloomFilter WHERE title = @title;');
        return filter;
    } catch(e){return false;}
}

// Get recommended articles from articleRecommendations table
// Update recommendations if necessary
// input: string
async function dbSelectArticleRecommendations(title){
    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select most recent article recommendations for given article
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .query(
                'SELECT TOP (1) recommendations, time_stamp FROM articleRecommendations \
                WHERE articleTitle = @title ORDER BY id DESC;'
            );
        
        // If article does not have recommendations associated with it 
        // or its recommendations have not been updated recently, 
        // lazily update its recommendations and return existing result
        if(result.recordsets[0].length == 0){
            dbInsertArticleRecommendations(title);
            return false;
        } else {
            let currentTime = (new Date).getTime();
            let lastUpdate = (new Date(result.recordsets[0][0].time_stamp)).getTime();
            if(currentTime - lastUpdate > maxRecommendationsAge) 
                dbInsertArticleRecommendations(title);
            return JSON.parse(result.recordsets[0][0].recommendations);
        }
    } catch(e){return false;}
}

// Update recommendations associated with given article
// input: string, int
async function dbInsertArticleRecommendations(title, numRecs = 3){
    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select all articles and relavent data for recommendations
        // If filter DNE for article that does exist, create filter
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .query(
                'SELECT title, bloomFilter, coverImage FROM article WHERE title != @title; \
                SELECT bloomFilter FROM article WHERE title = @title;'       
            );
        if(result.recordsets[1].length != 1) return false;
        let aFilter = result.recordsets[1][0].bloomFilter;
        if(typeof aFilter != 'number') aFilter = await dbUpdateArticleFilter(title);

        // Compare all articles to given article using bloom filter pseudo hamming distance
        // Order comparisons such that best recommendations appear last in array
        let buckets = new Array(filterSize).fill(null).map(e => []); 
        while(row = result.recordsets[0].pop()) 
            if(typeof row.bloomFilter == 'number')
                buckets[(((aFilter & row.bloomFilter) >>> 0)
                .toString(2).match(/1/g) || "").length].push({
                    title: row.title,
                    coverImage: JSON.parse(row.coverImage)
                });

        // Flatten buckets array and store last "numRecs" elements
        // Store new recommendations in articleRecommendations table and return result
        let recommendations = JSON.stringify([].concat(...buckets).slice(-numRecs));
        result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .input('recommendations', sql.VarChar(maxRecommendationsLen), recommendations)
            .query(
                'INSERT INTO articleRecommendations (articleTitle, recommendations) \
                VALUES(@title, @recommendations)'
            );
        return result.rowsAffected[0] == 1 ? true : false;
    } catch(e){return false;}
}
