// If open html tags from markup exist by the end of str, close them
function closeHTMLtags(str){
	var elems = [
		['&lt;!', '!&gt;'],
		['&lt;~', '~&gt;'],
		['&lt;-', '-&gt;'],
		['&lt;_', '_&gt;'],
		['&lt;`', '`&gt;'],
		['&lt;#', '#&gt;']
	];

	elems.forEach(elem => {
		diff = 0;
		for(a = 0; a < str.length - elem[1].length; a++){
			if(str.substring(a, a + elem[0].length) == elem[0]) diff++;
			else if(str.substring(a, a + elem[1].length) == elem[1] && diff > 0) diff--;
		}
		for(a = 0; a < diff; a++) str += elem[1];
	});

	return str;
}

// Escape HTML characters...
function escapeHTML(str){
	return str.replace(
		/[<>'"]/g,
		tag => ({
			'<': '&lt;',
			'>': '&gt;',
			"'": '&#039;',
			'"': '&quot;'
		}[tag] || tag)
	);
}

// Replace escaped html for markdown characters with HTML tags
function markupHTML(str){ 
	return closeHTMLtags(escapeHTML(str)).replace(
		/(&lt;[~!-_`#])|([~!-_`#]&gt;)|/g,
		tag => ({
			'&lt;~': '<i>',     '~&gt;': '</i>',
			'&lt;!': '<b>',     '!&gt;': '</b>',
			'&lt;-': '<del>',   '-&gt;': '</del>',
			'&lt;_': '<sub>',   '_&gt;': '</sub>',
			'&lt;`': '<sup>',   '`&gt;': '</sup>',
			'&lt;#': '<mark>',  '#&gt;': '</mark>'
		}[tag] || tag)
	);
}
