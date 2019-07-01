// Build HTML for each article being recommended to client
articleRecommendations.forEach(rec => {
    href = 'article?code=vX4RJPEMviAFcEE4u7QV1ualG0KakeZGISTdVpLFMtd93e0v52f7jw==&article=' + rec.title + '&' + document.cookie;
    document.getElementById("articleRecsContainer").innerHTML += '<a href = "' + href + '"><div class = "articleRecomendation">' + 
        '<img class = "articleThumbImage" src="' + escapeHTML(rec.coverImage.url) + '"><div class = "articleRecTitle">' + rec.title + '</div>' + 
    '</div></a>';
});
