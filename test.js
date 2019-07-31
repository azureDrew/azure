f(userId, type, superType, superObjectId, obj){
	try{
		pool = pool || await sql.connect(utils.connectionObj);
		
		// check for existance of superObject first
		// If DNE, return false, otherwise do below
		
		// Look up if foriegn key constraint will enforce above automatically
		
		let result = await pool.request()
			.input("table", sql.VarChar(), camalCase([superType, type]))
			.input("userId", sql.Int, userId)
			.input("superId", sql.Int, superObjectId)
		if(type == "comment")
			result = await result
				.input("parrentCommentId", sql.Int, obj.parrentCommentId)
				.input("body", sql.VarChar(MAX_COMMENT_LEN), obj.body)
				.query(
					`insert into @table 
					(userId, superId, parrentCommentId, body)  
					VALUES(@userId, @superId, @parentCommentId, @body)`
				);
		else if(type == "tag")
			result = await result
				.input("body", sql.VarChar(MAX_TAG_LEN), obj.body)
				.query(
					`insert into @table 
					(userId, superId, body) 
					VALUES(@userId, @superId, @body)`
				);
		else return false;
		return result.rowsAffected[0] == 1 ? true : false;
	}catch(e){
		// log error then return false
		return false;
	}
}
