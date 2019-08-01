let dbFieldTypeMap = {
    userId: sql.Int,
    postId: sql.Int,
    postCommentId: sql.Int,
    groupId: sql.Int,
    groupMemberId: sql.Int,
    commentId: sql.Int,
    tagId: sql.Int,
    title: sql.VarChar(256)
    description: sql.VarChar(2048),
    imageUrl: sql.VarChar(256),
    status: sql.TinyInt
    // ...
}

// Insert "entries" into "table" in DB.
async function dbInsert(data){
    try{
        let table = data[0];
        let entries = data[1];

        // Set up connection pool and establish query request
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request();

        // Create strings for the sql query.
        // Build out prepared statement (result).
        let columns = " (";
        let values = " VALUES( ";
        entries.forEach(entry => {
            columns += entry.field + ", ";
            values += "@" + entry.field + ", ";
            result = result.input(entry.field, dbFieldTypeMap[entry.field], entry.val);
        });
        values = values.slice(0, -2) + ") ";
        columns = columns.slice(0, -2) + ") ";

        // Attempt insert and return success or failure result.
        result = await result.query('INSERT INTO dbo.' + table + columns + values);
        return result.rowsAffected == 1 ? true : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}
