const dbTables = {
    testTableUno: {
        myFirstCol: sql.VARCHAR(32),
        mySecondCol: sql.VARCHAR(8),
        theThirdstCol: sql.INT,
    },
};

// TODO: build actual function
// Record error and return standardized thrown error result
function logError(e){
    // log error in some tbd way
    
    // Return some standard result such as the error itself or boolean
    return false;
}

// Create connection pool and return request object
async function dbConnect() {
    try {
        pool = pool || await sql.connect(utils.connectionObj);
        return (await pool.request());
    } catch(e) {return logError(e);}
}

// Insert "entries" into "table" in DB.
async function dbInsert(table, entries) {
    try {
        // Verify table then set up DB connection
        if(dbTables[table] == null) return false;
        let result = await dbConnect();

        // Create string for sql query and build out prepared statement
        let columns, values;
        entries.forEach(entry => {
            columns += `${entry.field},`;
            values += `@${entry.field},`;
            result = result.input(entry.field, dbTables[table][entry.field], entry.val);
        });
        let queryStr = `INSERT INTO ${table} (${columns}) VALUES(${values})`;

        // Attempt insert and return success or failure result.
        return (await result.query(queryStr)).rowsAffected == 1 ? true : false;
    } catch(e) {return logError(e);}
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
