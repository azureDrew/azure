f(userId, type, superType, superObjectId, obj){
	if(
		typeof userId != int ||
		typeof type != string ||
		typeof superType != string ||
		typeof superObjectId != int
	) return false;

	pool = pool || await sql.connect(utils.connectionObj);
	let table = superType + upper(type);
	let result = await pool.request()
		.input("userId", sql.int, userId)
		.input("superId", sql.int, superObjectId)
	if(type == "comment")
		result = await result
			.input("parrentCommentId", sql.int, obj.parrentCommentId)
			.input("body", sql.varchar(size), obj.body)
			.query(
				"insert into " + table + " 
				(userId, superId, parrentCommentId, body) 
				VALUES(@userId, @superId, @parentCommentId, @body)"
			);
	else if(type == "tag")
		result = await result
			.input("body", sql.varchar(size), obj.body)
			.query(
				"insert into " + table + " 
				(userId, superId, body) 
				VALUES(@userId, @superId, @body)"
			);
	else return false;
	return result.rowsAffected[0] == 1 ? true : false;
}
