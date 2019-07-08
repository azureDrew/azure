let fs = require('fs');
let ejs = require('ejs');
let sql = require('mssql');
let utils = require('./utils');
let bf = require('bloomfilter');
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
        body = await dbInsertArticle(JSON.parse(req.postArticle));

    // If client is requesting recommended similar articles to input article
    else if(req.getArticleRecommendations)
        body = await dbSelectArticleRecommendations(req.getArticleRecommendations);

    // If client is lost
    else body = false; // Replace with redirect to error.html once made

    context.res = {
        status: 200,
        body: body,
        headers: {'Content-Type': 'text/html'}
    };
    context.done();
};

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// Article Transactions ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

// Get article from DB by given title
// input: string, string
async function dbSelectArticle(title, previousPage){
    let maxTitleLen = 128;
    let maxPreviousPageLen = 256;

    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select row from article table by title and all tags associated with it
        // Insert row into articleView table to log traffic, then output id for row
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .input('previousPage', sql.VarChar(maxPreviousPageLen), previousPage)
            .query(
                'SELECT title, author, coverImage, body, time_stamp \
                    FROM article WHERE title = @title; \
                SELECT tag FROM articleTag WHERE articleTitle = @title; \
                INSERT into articleViewed (articleTitle, previousPage) \
                    VALUES(@title, @previousPage) \
                SELECT SCOPE_IDENTITY();'
            );

        // Clean up / format DB result to make coherent object, then return result
        let article = result.recordsets[0][0];
        article.body = JSON.parse(article.body);
        article.tags = result.recordsets[1];
        article.coverImage = JSON.parse(article.coverImage);
        return JSON.stringify(article);
    } catch(e){return false;}
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
        let batchInput = 'INSERT INTO article (title, author, coverImage, body) \
            VALUES(@title, @author, @coverImage, @body) ';
        
        // For each articleTag, insert row into articleTag table
        // Only insert first maxNumOfTags tags and only if article insert was successful
        batchInput += ' IF @@ROWCOUNT = 1 BEGIN ';
        for(a = 0; a < article.tags.length && a < maxNumOfTags; a++){ 
            batchInput += ' INSERT INTO articleTag (articleTitle, tag) \
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

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Recommendations Functionality /////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

// Create (4 hash, 32 bit) bloom filter for article as 32 bit, possitive int
// Use article tags to determin set membership
// input: [string, ...]
async function buildArticleFilter(tags){
    let maxNumOfTags = 5;
    let bloom = new bf.BloomFilter(32, 4);
    for(a = 0; a < tags.length && a < maxNumOfTags; a++)
        bloom.add(tags[a]);
    return ([].slice.call(bloom.buckets)[0] >>> 0);
}

// Get recommended articles from articleRecommendations table
// Update recommendations if necessary
// input: string
async function dbSelectArticleRecommendations(title){
    let maxAge = 1000000; // microseconds
    let maxTitleLen = 128;

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
        // update its recommendations, but return existing result before update completes
        if(result.recordsets[0].length == 0){
            updateArticleRecommendations(title);
            return false;
        } else {
            let currentTime = (new Date).getTime();
            let lastUpdate = (new Date(result.recordsets[0][0].time_stamp)).getTime();
            if(currentTime - lastUpdate > maxAge) updateArticleRecommendations(title);
            return result.recordsets[0][0].recommendations;
        }
    } catch(e){return false;}
}

// Update recommendations associated with given article
// input: string, int
async function updateArticleRecommendations(title, numRecommendations = 3){
    let maxTitleLen = 128;
    let maxRecommendationsLen = 1024;

    try{
        // Connect to DB with pool (if DNE) and set up prepared statement query
        // Select all articles and relavent data for recommendations
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input('title', sql.VarChar(maxTitleLen), title)
            .query(
                'SELECT title, bloomFilter, coverImage FROM article; \
                SELECT bloomFilter FROM article WHERE title = @title;'       
            );
        
        // If input article does not exists, return false
        // Otherwise, store results and continue
        if(result.recordsets[1].length != 1) return false;
        let aFilter = result.recordsets[1][0].bloomFilter;
        let allFilters = result.recordsets[0];

        // If filter DNE for an article that does exist, create its filter
        if(typeof aFilter != 'number'){
            // Get tags of article, then create filter based on tags
            let tags = [];
            result = await pool.request()
                .input('title', sql.VarChar(maxTitleLen), title)
                .query('SELECT tag FROM articleTag WHERE articleTitle = @title;');
            result.recordsets[0].forEach(obj => tags.push(obj.tag));
            aFilter = await buildArticleFilter(tags);

            // Update article row with created filter
            result = await pool.request()
                .input('title', sql.VarChar(maxTitleLen), title)
                .input('bloomFilter', sql.Int, aFilter)
                .query('UPDATE article SET bloomFilter = @bloomFilter WHERE title = @title;');
        }

        // Compare all article filters to given article filter using bloom filter hamming distances
        // Sort comparisons such that best recommendations appear last in array
        let order = new Array(32).fill(null);
        while(row = allFilters.pop()){
            if(typeof row.bloomFilter == 'number'){
                similarity = (aFilter & row.bloomFilter).toString(2).match(/1/g).length;
                if(order[similarity] == null) order[similarity] = [];
                order[similarity].push({
                    title: row.title,
                    coverImage: JSON.parse(row.coverImage)
                });
            }
        }

        // Flatten order array and store last "numRecommendations" elements
        // Store new recommendations in articleRecommendations table and return query result
        let recommendations = [].concat(...order.filter(e => e != null)).slice(-numRecommendations);
        recommendations = JSON.stringify(recommendations);
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
