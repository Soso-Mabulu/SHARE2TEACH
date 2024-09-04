const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('./app'); //app is exported from app.js

chai.use(chaiHttp);

describe('File Reporting API', () => {
    describe('POST /report', () => {
        it('should report a document successfully', (done) => {
            chai.request(app)
                .post('/report')
                .send({ file_id: 1, user_id: 123, report_details: 'Inappropriate content' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message', 'Report submitted successfully');
                    done();
                });
        });

        it('should return an error if file_id is missing', (done) => {
            chai.request(app)
                .post('/report')
                .send({ user_id: 123, report_details: 'Inappropriate content' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error', 'File ID, User ID, and report details are required');
                    done();
                });
        });

        it('should return an error if user_id is missing', (done) => {
            chai.request(app)
                .post('/report')
                .send({ file_id: 1, report_details: 'Inappropriate content' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error', 'File ID, User ID, and report details are required');
                    done();
                });
        });

        it('should return an error if report_details are missing', (done) => {
            chai.request(app)
                .post('/report')
                .send({ file_id: 1, user_id: 123 })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error', 'File ID, User ID, and report details are required');
                    done();
                });
        });

        it('should handle database connection errors gracefully', (done) => {
            // Simulate a database connection error
            const originalConnect = app.locals.db.connect;
            app.locals.db.connect = (callback) => callback(new Error('Database connection failed'));

            chai.request(app)
                .post('/report')
                .send({ file_id: 1, user_id: 123, report_details: 'Inappropriate content' })
                .end((err, res) => {
                    expect(res).to.have.status(500);
                    expect(res.body).to.have.property('error', 'Failed to connect to the database');

                    // Restore the original connect method
                    app.locals.db.connect = originalConnect;
                    done();
                });
        });
    });
});
