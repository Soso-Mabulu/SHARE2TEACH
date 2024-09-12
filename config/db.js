const sql = require('mssql');
require('dotenv').config();

// Initialize connection pool once and share it globally
let poolPromise;

async function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect({
            server: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            options: {
                encrypt: true, 
                trustServerCertificate: true,
            },
            pool: {
                max: 20, // Increase the max connections in the pool
                min: 5,
                idleTimeoutMillis: 60000, // Increase the idle timeout
            }
        });
    }
    return poolPromise;
}

module.exports = getPool;
