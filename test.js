utils.dbFieldTypeMap = {
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

// Objects in DB represented by a (object, objectStatus, objectContent) triplett of tables
utils.statusContentObjects = ["user", "post", "group"];

// List of all table names in DB
utils.dbTableNames = ["" /* ... */];

// Insert "entries" into "table" in DB.
async function dbInsert(table, entries){
    try{
        // If "table" is not a table in DB, return false
        if(!utils.dbTableNames.includes(table)) return false;
        
        // Set up connection pool and establish query request
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request();

        // Create strings for the sql query.
        // Build out prepared statement (result).
        let columns = " (";
        let values = " VALUES( ";
        let entriesLength = Object.keys(entries).length() - 1;
        entries.forEach((entry, counter) => {
            columns += entry.field + (counter != entriesLength ? ", " : ") ");
            values += "@" + entry.field + (counter != entriesLength ? ", " : ") ");
            result = result.input(entry.field, utiles.dbFieldTypeMap[entry.field], entry.val);
        });

        // Attempt insert and return success or failure result.
        result = await result.query("INSERT INTO " + table + " " + columns + values);
        return result.rowsAffected == 1 ? true : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}

// Get a given object's content and status by its respective table ID
getObject(type, objectId){
    try{
        // If "type" is not an allowed object type, return false
        if(!utils.statusContentObjects.includes(type)) return false;
        
        // Set up connection pool, build prepared query, send query, and return result
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input("id", sql.Int, objectId)
            .query(
                "SELECT TOP(1) * FROM dbo." + type + "Status WHERE " + type + "Id = @id ORDER BY id DESC;"
                "SELECT TOP(1) * FROM dbo." + type + "Content WHERE " + type + "Id = @id ORDER BY id DESC;"
            );
        
        // Return object content and status if object's status != hidden
        return result.recordsets[1][0] != 0 ? {
            status: result.recordsets[1][0],
            content: result.recordsets[0][0] 
        } : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}
