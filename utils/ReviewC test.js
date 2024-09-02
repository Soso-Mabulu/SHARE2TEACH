const chai = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const app = require('../app'); // Add your express app here
const { File } = require('../models/File'); // Assuming File model is in this path

const { expect } = chai;

describe('File Review Endpoint', () => {
  beforeEach(() => {
    sinon.restore(); // Reset mocks before each test
  });

  // Test for successful retrieval of file details
  it('should retrieve file details', async () => {
    const mockFile = { _id: '123', name: 'test-file.txt' };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);

    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken') // Simulate valid token
      .expect(200);

    expect(res.body.file).to.have.property('name');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

  // Test for successful update of file status
  it('should update file status (approved)', async () => {
    const mockFile = { _id: '123', save: sinon.stub().resolves() };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);

    const res = await request(app)
      .put('/files/123/review')
      .set('Authorization', 'Bearer validToken') // Simulate valid token
      .send({ status: 'approved' })
      .expect(200);

    expect(res.body.message).to.equal('File approved');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
    expect(mockFile.save.calledOnce).to.be.true;
  });

  // Test for handling file not found error (GET)
  it('should handle file not found error (GET)', async () => {
    const findByIdStub = sinon.stub(File, 'findById').resolves(null);

    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken') // Simulate valid token
      .expect(404);

    expect(res.body.error).to.equal('File not found');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

  // Test for handling invalid token error (Authorization)
  it('should handle invalid token error', async () => {
    const res = await request(app)
      .get('/files/123/review')
      .expect(401);

    expect(res.body.error).to.equal('Unauthorized');
  });

  // Test for handling database error
  it('should handle database error', async () => {
    const findByIdStub = sinon.stub(File, 'findById').rejects(new Error('Database error'));

    const res = await request(app)
      .get('/files/123/review')
      .set('Authorization', 'Bearer validToken') // Simulate valid token
      .expect(500);

    expect(res.body.error).to.equal('Internal Server Error');
  });

  // Test for successful retrieval of file review details
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
      .set('Authorization', 'Bearer validToken') // Simulate valid token
      .expect(200);

    expect(res.body.reviewComments).to.equal('Minor formatting issues');
    expect(res.body.reviewer.name).to.equal('John Doe');
    expect(res.body.reviewStatus).to.equal('approved');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

  // Test for handling invalid status in PUT request
  it('should handle invalid status', async () => {
    const mockFile = { _id: '123', save: sinon.stub().resolves() };
    const findByIdStub = sinon.stub(File, 'findById').resolves(mockFile);

    const res = await request(app)
      .put('/files/123/review')
      .set('Authorization', 'Bearer validToken') // Simulate valid token
      .send({ status: 'invalid' })
      .expect(400);

    expect(res.body.error).to.equal('Invalid status');
    expect(findByIdStub.calledOnceWithExactly('123')).to.be.true;
  });

});
