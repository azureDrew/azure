const dbTables = {
    testTableUno: {
        myFirstCol: sql.VARCHAR(32),
        mySecondCol: sql.VARCHAR(8),
        theThirdstCol: sql.INT,
    },
};

// TODO: build actual function
// Record error and return standardized thrown error result
function logError (e) {
    // log error in some tbd way
    
    // Return some standard result such as the error itself or boolean
    return false;
}

// Create connection pool and return request object
async function dbConnect () {
    try {
        pool = pool || await sql.connect(utils.connectionObj);
        return (await pool.request());
    } catch(e) {return logError(e);}
}

// Attempt insert of "entries" into DB "table"
async function dbInsert (table, entries) {
    try {
        let cols, vals;
        let result = await dbConnect();
        entries.forEach(entry => {
            cols += `${entry.field},`;
            vals += `@${entry.field},`;
            result = result.input(entry.field, dbTables[table][entry.field], entry.val);
        });
        let queryStr = `INSERT INTO ${table} (${cols}) VALUES(${vals})`; //.slice(0,-1)
        return (await result.query(queryStr)).rowsAffected == 1 ? true : false;
    } catch (e) {return logError(e);}
}

// Attempt batch insert of "batch" "entries" into DB "table"
// Note: all rows being inserted must be for DB "table"
async function dbBatchInsert (table, batch) {
    try {
        let queryStr, cols, vals;
        let result = await dbConnect();
        for(a = 0; a < batch.length() && a < MAX_BATCH_SIZE; a++){
            cols = "";
            vals = "";
            batch[a].forEach(entry => {
                cols += `${entry.field + a},`;
                vals += `@${entry.field + a},`;
                result = result.input(entry.field + a, dbTables[table][entry.field], entry.val);
            });
            queryStr += `INSERT INTO ${table} (${cols}) VALUES(${vals}); `;
        };
        return (await result.query(queryStr)).rowsAffected == 1 ? true : false;
    } catch (e) {return logError(e);}
}


// Attempt batch insert of "batch" "entries" into DB "table"
// Note: all rows being inserted must be for DB "table"
async function dbBatchInsert (table, batch) {
    for(a = 0; a < batch.length() && a < MAX_BATCH_SIZE; a++){
        if(!dbInsert(table, batch[a])) return false;
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
