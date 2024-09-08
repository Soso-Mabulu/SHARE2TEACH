const sql = require('mssql');
require('dotenv').config();

async function connectToDatabase() {
    try {
        // Create a connection pool
        const pool = await sql.connect({
            server: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        });
        
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err.message);
        throw err;
    }
}

module.exports = connectToDatabase;
