if(articleJson == false) document.getElementById("articleContainer").innerHTML = 'Article does not exist';
else{
	document.getElementById("articleContainer").innerHTML = '' +
		'<div class = "articleSubsectionContainer centerText" id = "articleTitle"></div>' +
		'<div class = "articleSubsectionContainer centerText" id = "articleAuthor"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleCoverImage"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleMetaTags"></div>' +
		'<div class = "articleSubsectionContainer" id = "articleBody"></div>';

	document.title = articleJson.title;
	document.getElementById("articleTitle").innerHTML = "<h2>" + articleJson.title + "<h2>";
	document.getElementById("articleCoverImage").innerHTML = '<img class = "articleImage" src="' + articleJson.coverImage.url + '"><div class = "articleImageDescription">' + articleJson.coverImage.description + '</div>';

	t = articleJson.time_stamp.split(/[- :]/);
	timeStamp = t[2] + ' ' + t[1] + ' ' + t[0];
	document.getElementById("articleAuthor").innerHTML = 'By ' + articleJson.author + ' - ' + timeStamp;

	metaTags = "";
	articleJson.metaTags.forEach(tag => 
		metaTags += '<div class = "articleMetaTag">' + tag.tag + '</div>'
	);
	document.getElementById("articleMetaTags").innerHTML = metaTags + "<br>";

	body = "";
	articleJson.body.forEach(section => body += typeof section == "string" ? 
		'<p class = "articleParagraph">' + section + '</p>' :
		'<br><img class = "articleImage" src="' + section.url + '"><div class = "articleImageDescription">' + section.description + '</div><br>'
	);
	document.getElementById("articleBody").innerHTML = body;
}
