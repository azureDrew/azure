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

    // For each markdown element, convert their occurences in str into corresponding HTML element
	// Every other conversion should be opening/closing tag
	// Close str with closing tag if uneven markdown elements exist in input string
    elems.forEach(elem => {
        a = 0;
        if((str.match(elem[0], 'g') || []).length % 2 != 0) str += elem[2];
        while(str.match(elem[0]))
            str = a++ % 2 == 0 ? str.replace(elem[0], elem[1]) : str.replace(elem[0], elem[2]);
    });
    return str;
}
