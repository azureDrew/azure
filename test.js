let dbFieldTypeMap = {
    userId: sql.Int,
    postId: sql.Int,
    postCommentId: sql.Int,
    groupId: sql.Int,
    groupMemberId: sql.Int,
    commentId: sql.Int,
    tagId: sql.Int,
    title: sql.VarChar(256), 
    description: sql.VarChar(2048),
    imageUrl: sql.VarChar(256),
    status: sql.TinyInt
    // ...
}

// Insert "entries" into "table" in DB.
async function dbInsert(table, entries){
    try{
        // Set up connection pool and establish query request
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request().input("table", "dbo." + table);

        // Create strings for the sql query.
        // Build out prepared statement (result).
        let columns = " (";
        let values = " VALUES( ";
        let entriesLength = entries.length() - 1;
        entries.forEach((entry, counter) => {
            columns += entry.field + (counter != entriesLength ? ", " : ") ");
            values += "@" + entry.field + (counter != entriesLength ? ", " : ") ");
            result = result.input(entry.field, dbFieldTypeMap[entry.field], entry.val);
        });

        // Attempt insert and return success or failure result.
        result = await result.query('INSERT INTO @table ' + columns + values);
        return result.rowsAffected == 1 ? true : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}
