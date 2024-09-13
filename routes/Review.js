const express = require('express');
const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const authorize = require('../middleware/authorize');

const app = express();
app.use(express.json());

// Middleware for access control
const verifyModerator = (req, res, next) => {
    const { role } = req.body; // Assuming role is sent in the request body
    if (role !== 'moderator') {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

// Endpoint to review files
app.post('/review/:id', verifyModerator, (req, res) => {
    const { id } = req.params;
    const { decision, moderator_id } = req.body;

    if (!decision || !moderator_id) {
        return res.status(400).json({ error: 'Decision and Moderator ID are required' });
    }

    const connection = new Connection(config);
    connection.on('connect', async err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        try {
            const reviewTime = moment().tz('Africa/Johannesburg').format('YYYY-MM-DD HH:mm:ss');
            let updateQuery;

            if (decision === 'approved') {
                updateQuery = `
                    INSERT INTO approvedDocuments (id, document, reviewDate, moderatorId)
                    SELECT id, document, @review_time, @moderator_id
                    FROM uploadedDocuments
                    WHERE id = @id;
                `;
            } else if (decision === 'rejected') {
                updateQuery = `
                    INSERT INTO rejectedDocuments (id, document, reviewDate, moderatorId)
                    SELECT id, document, @review_time, @moderator_id
                    FROM uploadedDocuments
                    WHERE id = @id;
                `;
            } else {
                return res.status(400).json({ error: 'Invalid decision' });
            }

            const deleteQuery = `
                DELETE FROM uploadedDocuments
                WHERE id = @id;
            `;

            const request = new Request(updateQuery, (err) => {
                if (err) {
                    throw new Error('Failed to update the document');
                }
            });

            request.addParameter('id', TYPES.Int, id);
            request.addParameter('moderator_id', TYPES.Int, moderator_id);
            request.addParameter('review_time', TYPES.DateTime, reviewTime);

            await new Promise((resolve, reject) => {
                request.on('requestCompleted', resolve);
                request.on('error', reject);
                connection.execSql(request);
            });

            const deleteRequest = new Request(deleteQuery, (err) => {
                if (err) {
                    throw new Error('Failed to delete the document from uploadedDocuments');
                }
            });

            deleteRequest.addParameter('id', TYPES.Int, id);

            await new Promise((resolve, reject) => {
                deleteRequest.on('requestCompleted', resolve);
                deleteRequest.on('error', reject);
                connection.execSql(deleteRequest);
            });

            res.status(200).json({ message: 'Document reviewed successfully' });
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
