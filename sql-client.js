const config = require('../config.json');

const mysql = require('mysql2');
const sqlConnection = mysql.createPool({
    host: config.sql_host,
    user: config.sql_user,
    password: config.sql_pass,
    database: config.sql_database,
    charset : 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
});

const sqlPromise = sqlConnection.promise();

async function sqlPromiseSafe(sql_q, inputs) {
    try {
        const [rows,fields] = await sqlPromise.query(sql_q, inputs);
        return {
            rows, fields, sql_q, inputs
        }
    } catch (err) {
        console.error(`SQL Error: ${err.message}`);
        console.error(sql_q);
        console.error(inputs);
        console.error(err);
        return {
            rows: [], fields: [], sql_q, inputs, error: err
        }
    }
}

process.on('uncaughtException', function(err) {
    console.error(`uncaughtException - ${err.sqlMessage}`);
    process.exit(1)
});

module.exports = { sqlPromiseSafe };
