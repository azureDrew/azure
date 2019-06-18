if(article == false) document.getElementById("articleContainer").innerHTML = 'Article does not exist';
else{
	document.getElementById("articleContainer").innerHTML = '' +
		'<div class = "articleSubsectionContainer centerText" id = "articleTitle"></div>' +
		'<div class = "articleSubsectionContainer centerText" id = "articleAuthor"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleCoverImage"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleTags"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleBody"></div>';

	document.title = escapeHTML(article.title);
	document.getElementById("articleTitle").innerHTML = "<h2>" + escapeHTML(article.title) + "<h2>";
	document.getElementById("articleCoverImage").innerHTML = '<img class = "articleImage" src="' + escapeHTML(article.coverImage.url) + '"><div class = "articleImageDescription">' + markupHTML(article.coverImage.description) + '</div>';

	t = article.time_stamp.split(/[- :]/);
	timeStamp = t[2] + ' ' + t[1] + ' ' + t[0];
	document.getElementById("articleAuthor").innerHTML = 'By ' + escapeHTML(article.author) + ' - ' + escapeHTML(timeStamp);

	articleTags = "";
	article.tags.forEach(tag => 
		articleTags += '<div class = "articleTag">' + escapeHTML(tag.tag) + '</div>'
	);
	document.getElementById("articleTags").innerHTML = articleTags + "<br>";

	body = "";
	article.body.forEach(section => body += typeof section == "string" ? 
		'<p class = "articleParagraph">' + markupHTML(section) + '</p>' :
		'<br><img class = "articleImage" src="' + escapeHTML(section.url) + '"><div class = "articleImageDescription">' + markupHTML(section.description) + '</div><br>'
	);
	document.getElementById("articleBody").innerHTML = body;
}
