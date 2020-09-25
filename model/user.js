const db = require('../helper/db/query');

module.exports = {
    register: async (info) => {
        try {
            const insertQ = `insert into user (email, password, nickname) value ("${info.email}", "${info.password}", "${info.nickname}")`;
            return await db.querySync(insertQ);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },
}