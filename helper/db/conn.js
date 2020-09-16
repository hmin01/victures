const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuration
const configPath = path.join(__dirname, "../init/db_config.json");
const config = JSON.parse(fs.readFileSync(configPath).toString());

module.exports = {
    init: () => {
        return mysql.createPool({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            connectionLimit: 20,            // test: 20, release: 50
            waitForConnections: true
        });
    }
};