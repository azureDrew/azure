// Server returns false if article DNE or error occured
// Only attempt to populate page with article content if no such error occured and article exists
if(article == false) document.getElementById("articleContainer").innerHTML = 'Article does not exist';
else if(article != null){
	// Create skeleton for article to fill on page
	document.getElementById("articleContainer").innerHTML = '' +
		'<div class = "articleSubsectionContainer centerText" id = "articleTitle"></div>' +
		'<div class = "articleSubsectionContainer centerText" id = "articleAuthor"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleCoverImage"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleTags"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleBody"></div>';

	// Add article header to skeleton 
	document.title = escapeHTML(article.title);
	document.getElementById("articleTitle").innerHTML = "<h2>" + escapeHTML(article.title) + "<h2>";
	document.getElementById("articleCoverImage").innerHTML = '<img class = "articleImage" src="' + escapeHTML(article.coverImage.url) + '"><div class = "articleImageDescription">' + markupHTML(article.coverImage.description) + '</div>';

	// Add article timestamp to skeleton
	t = article.time_stamp.split(/[- :]/);
	timeStamp = t[2] + ' ' + t[1] + ' ' + t[0];
	document.getElementById("articleAuthor").innerHTML = 'By ' + escapeHTML(article.author) + ' - ' + escapeHTML(timeStamp);

	// Add metatags for article to skeleton
	articleTags = "";
	article.tags.forEach(tag => 
		articleTags += '<div class = "articleTag">' + escapeHTML(tag.tag) + '</div>'
	);
	document.getElementById("articleTags").innerHTML = articleTags + "<br>";

	// Add article content to skeleton
	body = "";
	article.body.forEach(section => body += typeof section == "string" ? 
		'<p class = "articleParagraph">' + markupHTML(section) + '</p>' :
		'<br><img class = "articleImage" src="' + escapeHTML(section.url) + '"><div class = "articleImageDescription">' + markupHTML(section.description) + '</div><br>'
	);
	document.getElementById("articleBody").innerHTML = body;
	
	// Adjust article appearence if client is not mobile
	if(!window.mobilecheck()){
		document.getElementById('articleBody').style.textAlign = "justify";
		document.getElementById('body').style.fontSize = "1.25em";
	}
}
