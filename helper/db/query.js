const mysql = require('./conn').init();

module.exports = {
    selectSync: async (query) => {
        let conn = null;
        try {
            conn = mysql.getConnection();
            const [rows] = await conn.query(query);
            conn.release();

            return {result: true, message: rows};
        } catch (err) {
            if (conn !== null) {
                conn.release();
            }
            return {result: false, message: err.message};
        }
    },
    
    querySync: async (query) => {
        let conn = null;
        try {
            conn = mysql.getConnection();
            await conn.beginTransaction();
            const [rows] = await conn.query(query);
            await conn.commit();
            conn.release();

            return {result: true, message: rows};
        } catch (err) {
            if (conn !== null) {
                await conn.rollback();
                conn.release();
            }
            return {result: false, message: err.message};
        }
    },

    bulkSync: async (query, bulk) => {
        let conn = null;
        try {
            conn = mysql.getConnection();
            await conn.beginTransaction();
            const [rows] = await conn.query(query, [bulk]);
            await conn.commit();
            conn.release();

            return {result: true, message: rows};
        } catch (err) {
            if (conn !== null) {
                await conn.rollback();
                conn.release();
            }
            return {result: false, message: err.message};
        }
    }
}