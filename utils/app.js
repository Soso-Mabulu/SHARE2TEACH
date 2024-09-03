const express = require('express');
const { Connection, Request } = require('tedious');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// Azure SQL Database configuration
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

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password'
    }
});

// API endpoint to report unwanted documents
app.post('/report', (req, res) => {
    const { file_id, user_id, report_details } = req.body;

    if (!file_id || !user_id || !report_details) {
        return res.status(400).json({ error: 'File ID, User ID, and report details are required' });
    }

    const connection = new Connection(config);

    connection.on('connect', err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        const query = `
            INSERT INTO REPORTS (file_id, reported_by, report_details, reported_at)
            VALUES (@file_id, @user_id, @report_details, GETDATE())
        `;

        const request = new Request(query, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to log the report' });
            }

            // Send notification to moderators
            const mailOptions = {
                from: 'your-email@gmail.com',
                to: 'moderator-email@gmail.com',
                subject: 'New Document Report',
                text: `A new report has been submitted for file ID: ${file_id}\nReported by: ${user_id}\nDetails: ${report_details}`
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    return res.status(500).json({ error: 'Failed to send notification' });
                }
                res.status(200).json({ message: 'Report submitted successfully' });
            });
        });

        request.addParameter('file_id', TYPES.Int, file_id);
        request.addParameter('user_id', TYPES.Int, user_id);
        request.addParameter('report_details', TYPES.NVarChar, report_details);

        connection.execSql(request);
    });

    connection.connect();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Fetch all reports
app.get('/reports', (req, res) => {
    const connection = new Connection(config);

    connection.on('connect', err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        const query = 'SELECT * FROM REPORTS';

        const request = new Request(query, (err, rowCount, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch reports' });
            }
            res.status(200).json(rows);
        });

        connection.execSql(request);
    });

    connection.connect();
});

// Mark a report as resolved
app.post('/reports/:id/resolve', (req, res) => {
    const { id } = req.params;

    const connection = new Connection(config);

    connection.on('connect', err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        const query = 'UPDATE REPORTS SET resolved = 1 WHERE report_id = @id';

        const request = new Request(query, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to resolve the report' });
            }
            res.status(200).json({ message: 'Report resolved successfully' });
        });

        request.addParameter('id', TYPES.Int, id);

        connection.execSql(request);
    });

    connection.connect();
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
