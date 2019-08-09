const dbTables{
    testTableUno: {
        myFirstCol: sql.VARCHAR(32),
        mySecondCol: sql.VARCHAR(8),
        theThirdstCol: sql.INT,
    },
};

// Create connection pool and return request object
async function dbConnect(){
    pool = pool || await sql.connect(utils.connectionObj);
    return await pool.request();
}

// Insert "entries" into "table" in DB.
async function dbInsert(table, entries){
    try{
        // Verify table then set up DB connection
        if(!Object.keys(dbTables).includes(table)) return false;
        let result = await dbConnect();
        let dbObj = dbTables[table];

        // Create strings for sql query and build out prepared statement
        let columns = " (";
        let values = " VALUES(";
        entries.forEach(entry => {
            columns += entry.field + ", ";
            values += "@" + entry.field + ", ";
            result = result.input(entry.field, dbObj[entry.field], entry.val);
        });
        columns = columns.slice(0, -2) + ") ";
        values += values.slice(0, -2) + ") ";

        // Attempt insert and return success or failure result.
        return (await result.query("INSERT INTO " + table + columns + values))
            .rowsAffected == 1 ? true : false;
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
