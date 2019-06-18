if(articleJson == false) document.getElementById("articleContainer").innerHTML = 'Article does not exist';
else{
	document.getElementById("articleContainer").innerHTML = '' +
		'<div class = "articleSubsectionContainer centerText" id = "articleTitle"></div>' +
		'<div class = "articleSubsectionContainer centerText" id = "articleAuthor"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleCoverImage"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleTags"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleBody"></div>';

	document.title = escapeHTML(articleJson.title);
	document.getElementById("articleTitle").innerHTML = "<h2>" + escapeHTML(articleJson.title) + "<h2>";
	document.getElementById("articleCoverImage").innerHTML = '<img class = "articleImage" src="' + escapeHTML(articleJson.coverImage.url) + '"><div class = "articleImageDescription">' + markupHTML(articleJson.coverImage.description) + '</div>';

	t = articleJson.time_stamp.split(/[- :]/);
	timeStamp = t[2] + ' ' + t[1] + ' ' + t[0];
	document.getElementById("articleAuthor").innerHTML = 'By ' + escapeHTML(articleJson.author) + ' - ' + escapeHTML(timeStamp);

	articleTags = "";
	articleJson.tags.forEach(tag => 
		articleTags += '<div class = "articleTag">' + escapeHTML(tag.tag) + '</div>'
	);
	document.getElementById("articleTags").innerHTML = articleTags + "<br>";

	body = "";
	articleJson.body.forEach(section => body += typeof section == "string" ? 
		'<p class = "articleParagraph">' + markupHTML(section) + '</p>' :
		'<br><img class = "articleImage" src="' + escapeHTML(section.url) + '"><div class = "articleImageDescription">' + markupHTML(section.description) + '</div><br>'
	);
	document.getElementById("articleBody").innerHTML = body;
}
