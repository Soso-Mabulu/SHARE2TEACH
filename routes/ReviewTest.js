const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { Connection, Request } = require('tedious');
const app = require('../app'); 

chai.use(chaiHttp);
const { expect } = chai;

describe('POST /review/:id', () => {
    let connectionStub;
    let requestStub;

    beforeEach(() => {
        connectionStub = sinon.stub(Connection.prototype, 'connect');
        requestStub = sinon.stub(Connection.prototype, 'execSql');
    });

    afterEach(() => {
        connectionStub.restore();
        requestStub.restore();
    });

    it('should return 403 if role is not moderator', (done) => {
        chai.request(app)
            .post('/review/1')
            .send({ role: 'user', decision: 'approved', moderator_id: 123 })
            .end((err, res) => {
                expect(res).to.have.status(403);
                expect(res.body).to.have.property('error', 'Access denied');
                done();
            });
    });

    it('should return 400 if decision or moderator_id is missing', (done) => {
        chai.request(app)
            .post('/review/1')
            .send({ role: 'moderator' })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('error', 'Decision and Moderator ID are required');
                done();
            });
    });

    it('should return 400 if decision is invalid', (done) => {
        chai.request(app)
            .post('/review/1')
            .send({ role: 'moderator', decision: 'invalid', moderator_id: 123 })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('error', 'Invalid decision');
                done();
            });
    });

    it('should return 200 and update the document if decision is approved', (done) => {
        connectionStub.yields(null);
        requestStub.yields(null);

        chai.request(app)
            .post('/review/1')
            .send({ role: 'moderator', decision: 'approved', moderator_id: 123 })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('message', 'Document reviewed successfully');
                done();
            });
    });

    it('should return 200 and update the document if decision is rejected', (done) => {
        connectionStub.yields(null);
        requestStub.yields(null);

        chai.request(app)
            .post('/review/1')
            .send({ role: 'moderator', decision: 'rejected', moderator_id: 123 })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('message', 'Document reviewed successfully');
                done();
            });
    });

    it('should return 500 if there is a database connection error', (done) => {
        connectionStub.yields(new Error('Failed to connect to the database'));

        chai.request(app)
            .post('/review/1')
            .send({ role: 'moderator', decision: 'approved', moderator_id: 123 })
            .end((err, res) => {
                expect(res).to.have.status(500);
                expect(res.body).to.have.property('error', 'Failed to connect to the database');
                done();
            });
    });

    it('should return 500 if there is an error updating the document', (done) => {
        connectionStub.yields(null);
        requestStub.yields(new Error('Failed to update the document'));

        chai.request(app)
            .post('/review/1')
            .send({ role: 'moderator', decision: 'approved', moderator_id: 123 })
            .end((err, res) => {
                expect(res).to.have.status(500);
                expect(res.body).to.have.property('error', 'Failed to update the document');
                done();
            });
    });
});
