const sql = require('mssql');
const getPool = require('../config/db');
const generateToken = require('../utils/jwt');
// Get total approved documents count
exports.getApprovedDocuments = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS approved_count FROM DOCUMENT WHERE status = 'approved'`, {

            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching approved documents:', error);
        res.status(500).json({ error: 'Error fetching approved documents' });
    }
};

// Get total denied documents count
exports.getDeniedDocuments = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS denied_count FROM DOCUMENT WHERE status = 'denied'`, {

            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching denied documents:', error);
        res.status(500).json({ error: 'Error fetching denied documents' });
    }
};

// Get total reported documents count
exports.getReportedDocuments = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS reported_count FROM DOCUMENT WHERE status = 'reported'`, {
                
            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching reported documents:', error);
        res.status(500).json({ error: 'Error fetching reported documents' });
    }
};

// Get total pending documents count (documents not yet approved or denied)
exports.getPendingDocuments = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS pending_count FROM DOCUMENT WHERE status = 'pending'`, {
                
            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching pending documents:', error);
        res.status(500).json({ error: 'Error fetching pending documents' });
    }
};

// Get total user count
exports.getTotalUsers = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS user_count FROM [dbo].[USER]`, {

            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching total users:', error);
        res.status(500).json({ error: 'Error fetching total users' });
    }
};

// Get Active Users in the Past 30 Days
exports.getActiveUsers = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS active_users 
                    FROM [dbo].[USER] 
                    WHERE last_login > DATEADD(day, -30, GETDATE())`);

        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching active users:', error);
        res.status(500).json({ error: 'Error fetching active users' });
    }
};

// Get User Signups per Time Period
exports.getUserSignups = async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query(`SELECT COUNT(*) AS signups 
                    FROM [dbo].[USER] 
                    WHERE created_at BETWEEN @start_date AND @end_date`);

        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching user signups:', error);
        res.status(500).json({ error: 'Error fetching user signups' });
    }
};

// Get ratings per time period
exports.getRatingsPerTimePeriod = async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query(`SELECT AVG(rating) AS average_rating, COUNT(*) AS total_ratings FROM [dbo].[RATING] WHERE timestamp BETWEEN @start_date AND @end_date`,{

            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: 'Error fetching ratings' });
    }
};

// Get uploaded documents count per time period
exports.getUploadedDocuments = async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query(`SELECT COUNT(*) AS uploaded_docs FROM [dbo].[DOCUMENT] WHERE creationDate BETWEEN @start_date AND @end_date`,{

            });
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching uploaded documents:', error);
        res.status(500).json({ error: 'Error fetching uploaded documents' });
    }
};

// Get approved documents per time period
exports.getApprovedDocsPerPeriod = async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('status', sql.VarChar, 'approved')
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query('SELECT COUNT(*) AS approved_docs FROM [dbo].[DOCUMENT] WHERE status = @status AND created_at BETWEEN @start_date AND @end_date');
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching approved documents:', error);
        res.status(500).json({ error: 'Error fetching approved documents' });
    }
};

// Get denied documents per time period
exports.getDeniedDocsPerPeriod = async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('status', sql.VarChar, 'denied')
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query('SELECT COUNT(*) AS denied_docs FROM [dbo].[DOCUMENT] WHERE status = @status AND created_at BETWEEN @start_date AND @end_date');
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching denied documents:', error);
        res.status(500).json({ error: 'Error fetching denied documents' });
    }
};

// Get reported documents per time period
exports.getReportedDocsPerPeriod = async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('status', sql.VarChar, 'reported')
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query('SELECT COUNT(*) AS reported_docs FROM [dbo].[DOCUMENT] WHERE status = @status AND created_at BETWEEN @start_date AND @end_date');
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching reported documents:', error);
        res.status(500).json({ error: 'Error fetching reported documents' });
    }
};
