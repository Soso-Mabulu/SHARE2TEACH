const chai = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const app = require('../app'); // we must add our express app here
const { File } = require('../models/File'); // Assuming File model

describe('File Review Endpoint', () => {
  beforeEach(() => {
    sinon.restore(); // Reset mocks before each test
  });

  it('should retrieve file details', async () => {
    const mockFile = { _id: '123', name: 'test-file.txt' };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);

    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken')
      .expect(200);

    chai.expect(res.body.file).to.have.property('name');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

  it('should update file status (approved)', async () => {
    const mockFile = { _id: '123', save: sinon.stub().resolves() };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);

    const res = await request(app)
      .put('/files/123/review')
      .set('Authorization', 'Bearer validToken')
      .send({ status: 'approved' })
      .expect(200);

    chai.expect(res.body.message).to.equal('File approved');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
    expect(mockFile.save.calledOnce).to.be.true;
  });

  it('should handle file not found error (GET)', async () => {
    const findByIdStub = sinon.stub(File, 'findById').resolves(null);

    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken')
      .expect(404);

    chai.expect(res.body.error).to.equal('File not found');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

  it('should handle invalid token error', async () => {
    const res = await request(app)
      .get('/files/123/review')
      .expect(401);
  });

  it('should handle database error', async () => {
    const findByIdStub = sinon.stub(File, 'findById').rejects(new Error('Database error'));

    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken')
      .expect(500);
  });
  it('should retrieve file review details', async () => {
    const mockFile = {
      _id: '123',
      name: 'test-file.txt',
      reviewComments: 'Minor formatting issues',
      reviewer: { name: 'John Doe' },
      reviewStatus: 'approved'
    };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);
  
    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken')
      .expect(200);
  
    chai.expect(res.body.reviewComments).to.equal('Minor formatting issues');
    chai.expect(res.body.reviewer.name).to.equal('John Doe');
    chai.expect(res.body.reviewStatus).to.equal('approved');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

  it('should handle invalid status', async () => {
    const mockFile = { _id: '123', save: sinon.stub().resolves() };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);

    const res = await request(app)
      .put('/files/123/review')
      .set('Authorization', 'Bearer validToken')
      .send({ status: 'invalid' })
      .expect(400);
  });
});