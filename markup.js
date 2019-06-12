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
	elems.forEach(elem => {
		elemCount = (str.match(elem[0], 'g') || []).length;

		// Append closing tag to str if count of markdown elements is uneven
		if(elemCount % 2 != 0) str += elem[2];

		// For a given elem, every other conversion in str should be opening/closing tag
		for(a = 0; a < elemCount; a++)
			str = a++ % 2 == 0 ? str.replace(elem[0], elem[1]) : str.replace(elem[0], elem[2]);
	});
	return str;
}
