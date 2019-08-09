const dbTables{
    testTableUno: {
        myFirstCol: sql.VARCHAR(32),
        mySecondCol: sql.VARCHAR(8),
        theThirdstCol: sql.INT,
    },
};



// Insert "entries" into "table" in DB.
async function dbInsert(table, entries){
    try{
        // Verify table then set up DB connection
        if(!Object.keys(dbTables).includes(table)) return false;
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request();
        let dbObject = dbTables[table];

        // Create strings for sql query and build out prepared statement
        let columns = " (";
        let values = " VALUES( ";
        let entryCount = Object.keys(entries).length() - 1;
        entries.forEach((entry, counter) => {
            columns += entry.field + (counter != entryCount ? ", " : ") ");
            values += "@" + entry.field + (counter != entryCount ? ", " : ") ");
            result = result.input(entry.field, dbObject[entry.field], entry.val);
        });

        // Attempt insert and return success or failure result.
        result = await result.query("INSERT INTO " + table + " " + columns + values);
        return result.rowsAffected == 1 ? true : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}







/*
// Get given object's content and status by its respective table id
getObject(type, objectId){
    try{
        // If "type" is not an allowed object type, return false
        if(!utils.dbObjects.includes(type)) return false;
        
        // Set up connection pool, build prepared query, and send query
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input("id", sql.Int, objectId)
            .query(
                "SELECT TOP(1) * FROM dbo." + type + "Status WHERE " + type + 
                "Id = @id ORDER BY id DESC;"
                "SELECT TOP(1) * FROM dbo." + type + "Content WHERE " + type + 
                "Id = @id ORDER BY id DESC;"
            );
        
        // Return object content and status if object's status != hidden
        return result.recordsets[1][0] != 0 ? {
            status: result.recordsets[0][0],
            content: result.recordsets[1][0] 
        } : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}

// Get list of recommendations for similar objects to object by id
getRecommendations(type, objectId){
    try{
        // If "type" or "superType" is not an allowed object type, return false
        if(!utils.dbObjects.includes(type)) return false;
        
        // Set up connection pool, build prepared query, and send query
        pool = pool || await sql.connect(utils.connectionObj);
        let result = await pool.request()
            .input("id", sql.Int, objectId)
            .query(
                "SELECT TOP(1) * FROM dbo." + type + "Recommendations WHERE " + type + 
                "Id = @id ORDER BY id DESC;"
            );
        
        // Return recommendations for objects
        return result.recordsets.length == 1 ? JSON.parse(result.recordsets[0]) : false;
    } catch(e) {
        // log error and return false
        return false;
    }
}
*/
