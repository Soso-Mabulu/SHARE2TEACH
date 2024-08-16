const mysql = require('mysql2/promise');
require('dotenv').config();

async function connectToDatabase() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: true, // You might need to adjust this depending on your SSL setup
            }
        });
        console.log('Connected to the database.');
        return db;
    } catch (err) {
        console.error('Database connection failed:', err.code, err.message);
        throw err;
    }
}

module.exports = connectToDatabase;
