// Convert markdown characters into html equivelents
function markup(str){
	var elems = [
		['!!', '<b>', '</b>'],
		['~~', '<i>', '</i>'],
		['--', '<del>', '</del>'],
		['__', '<sub>', '</sub>'],
		['``', '<sup>', '</sup>'],
		['##', '<mark>', '</mark>']
	];
	
	// For each markdown element, convert their occurences in str into corresponding HTML tag
	// Every other conversion should be opening/closing tag
	elems.forEach(elem => {
		
		// Append closing tag to str if count of markdown elements is uneven
		if((str.match(elem[0], 'g') || []).length % 2 != 0) str += elem[2];
		
		a = 0;
		while(str.match(elem[0]))
			str = a++ % 2 == 0 ? str.replace(elem[0], elem[1]) : str.replace(elem[0], elem[2]);
	});
	return str;
}
