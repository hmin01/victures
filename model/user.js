const db = require('../helper/db/query');

module.exports = {
    register: async (info) => {
        try {
            const insertQ = `insert into user (email, password, nickname) value ("${info.email}", "${info.password}", "${info.nickname}")`;
            return await db.querySync(insertQ);
        } catch (err) {
            console.error(err.message);
            return {result: false, message: err.message};
        }
    },
    login: async (info) => {
        try {
            const selectQ = `select * from user where email="${info.email}" and password="${info.password}"`;
            console.log(selectQ)
            const result = await db.selectSync(selectQ);
            console.log(result);
            if (result.result && result.message.length > 0) {
                return result;
            } else {
                return {result: false, message: "아이디 또는 패스워드를 확인해주세요."};
            }
        } catch (err) {
            console.error(err.message);
            return {result: false, message: err.message};
        }
    },
    delete: async (id) => {
        try {
            const deleteQ = `delete from user where user_id=${id}`;
            return await db.querySync(deleteQ);
        } catch (err) {
            console.error(err.message);
            return {result: false, message: err.message};
        }
    }
}