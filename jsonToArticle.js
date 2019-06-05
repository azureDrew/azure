document.title = articleJson.title;
document.getElementById("articleTitle").innerHTML = "<h2>" + articleJson.title + "<h2>";
document.getElementById("articleCoverImage").innerHTML = '<img class = "articleImage" src="' + articleJson.coverImage.url + '"><div class = "articleImageDescription">' + articleJson.coverImage.description + '</div>';

t = articleJson.timeStamp.split(/[- :]/);
timeStamp = t[2] + ' ' + t[1] + ' ' + t[0];
document.getElementById("articleAuthor").innerHTML = 'By ' + articleJson.author + ' - ' + timeStamp;

metaTags = "";
articleJson.metaTags.forEach(tag => 
    metaTags += '<div class = "articleMetaTag">' + tag + '</div>'
);
document.getElementById("articleMetaTags").innerHTML = metaTags + "<br>";

body = "<br>";
articleJson.body.forEach(section => body += typeof section == "string" ? 
    '<div class = "articleParagraph">' + section + '</div><br>' :
    '<img class = "articleImage" src="' + section.url + '"><div class = "articleImageDescription">' + section.description + '</div><br>'
);
document.getElementById("articleBody").innerHTML = body;