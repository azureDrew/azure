// Use cookie value to tell server most recently viewed article upon new articl request
// Update cookie value when new article is received by client such that article chain continues. 
document.cookie = "previousArticleViewedId = " + article.previousArticleViewedId;

// Build HTML for each article being recommended to client
articleRecommendations.forEach(rec => {
    href = 'article?code=vX4RJPEMviAFcEE4u7QV1ualG0KakeZGISTdVpLFMtd93e0v52f7jw==&article=' + rec.title + '&' + document.cookie;
    document.getElementById("articleRecsContainer").innerHTML += '<a href = "' + href + '"><div class = "articleRecomendation">' + 
        '<img class = "articleThumbImage" src="' + escapeHTML(rec.coverImage.url) + '"><div class = "articleRecTitle">' + rec.title + '</div>' + 
    '</div></a>';
});
