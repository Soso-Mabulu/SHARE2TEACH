const express = require('express');
const { Connection, Request, TYPES } = require('tedious');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

const app = express();
app.use(express.json());

const config = {
    authentication: {
        options: {
            userName: 'username', 
            password: 'password' 
        },
        type: 'default'
    },
    server: 'server.database.windows.net', 
    options: {
        database: 'our-database', 
        encrypt: true
    }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password'
    }
});

app.post('/report', (req, res) => {
    const { file_id, user_id, report_details } = req.body;
    if (!file_id || !user_id || !report_details) {
        return res.status(400).json({ error: 'File ID, User ID, and report details are required' });
    }

    const connection = new Connection(config);
    connection.on('connect', async err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        try {
            const reportedAt = moment().tz('Africa/Johannesburg').format('YYYY-MM-DD HH:mm:ss');
            const query = `
                INSERT INTO REPORTS (file_id, reported_by, report_details, reported_at)
                VALUES (@file_id, @user_id, @report_details, @reported_at)
            `;
            const request = new Request(query, (err) => {
                if (err) {
                    throw new Error('Failed to log the report');
                }
            });

            request.addParameter('file_id', TYPES.Int, file_id);
            request.addParameter('user_id', TYPES.Int, user_id);
            request.addParameter('report_details', TYPES.NVarChar, report_details);
            request.addParameter('reported_at', TYPES.DateTime, reportedAt);

            await new Promise((resolve, reject) => {
                request.on('requestCompleted', resolve);
                request.on('error', reject);
                connection.execSql(request);
            });

            const mailOptions = {
                from: 'your-email@gmail.com',
                to: 'moderator-email@gmail.com',
                subject: 'New Document Report',
                text: `A new report has been submitted for file ID: ${file_id}\nReported by: ${user_id}\nDetails: ${report_details}`
            };

            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'Report submitted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        } finally {
            connection.close();
        }
    });

    connection.connect();
});

app.post('/reports/:id/deny', (req, res) => {
    const { id } = req.params;

    const connection = new Connection(config);
    connection.on('connect', async err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        try {
            const updateQuery = `
                UPDATE REPORTS SET report_details = 'denied' WHERE report_id = @id;
                INSERT INTO deniedDocuments (file_id, reported_by, report_details, reported_at)
                SELECT file_id, reported_by, report_details, reported_at FROM REPORTS WHERE report_id = @id;
                DELETE FROM REPORTS WHERE report_id = @id;
            `;
            const request = new Request(updateQuery, (err) => {
                if (err) {
                    throw new Error('Failed to deny the report');
                }
            });

            request.addParameter('id', TYPES.Int, id);

            await new Promise((resolve, reject) => {
                request.on('requestCompleted', resolve);
                request.on('error', reject);
                connection.execSql(request);
            });

            res.status(200).json({ message: 'Report denied and moved to deniedDocuments' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        } finally {
            connection.close();
        }
    });

    connection.connect();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
