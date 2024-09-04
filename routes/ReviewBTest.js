const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const mongoose = require('mongoose');
const { BlobServiceClient } = require('@azure/storage-blob');
const File = require('../models/File');  
const ModerationLog = require('../models/ModerationLog');  
const app = require('../app'); 
const request = require('supertest'); // For HTTP assertions

chai.use(sinonChai);
const { expect } = chai;

describe('File Review Endpoint', () => {
  let findByIdStub, blobServiceClientStub, getBlobClientStub, getPropertiesStub, saveStub, checkModeratorAccessStub;

  beforeEach(() => {
    findByIdStub = sinon.stub(File, 'findById');
    blobServiceClientStub = sinon.stub(BlobServiceClient, 'fromConnectionString').returns({
      getContainerClient: () => ({
        getBlobClient: () => ({
          getProperties: getPropertiesStub
        })
      })
    });
    getPropertiesStub = sinon.stub();
    saveStub = sinon.stub(ModerationLog.prototype, 'save');
    checkModeratorAccessStub = sinon.stub().callsFake((req, res, next) => next());
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET /files/:fileId/review', () => {
    it('should return 404 if file is not found', async () => {
      findByIdStub.resolves(null);

      const res = await request(app)
        .get('/files/123/review')
        .expect(404);

      expect(res.text).to.equal('File not found');
    });

    it('should return 500 if an error occurs while retrieving file details', async () => {
      findByIdStub.rejects(new mongoose.Error('Database error'));

      const res = await request(app)
        .get('/files/123/review')
        .expect(500);

      expect(res.text).to.equal('Error retrieving file details from database');
    });

    it('should return file and metadata if found', async () => {
      findByIdStub.resolves({ name: 'testFile', review: 'testReview' });
      getPropertiesStub.resolves({ metadata: 'testMetadata' });

      const res = await request(app)
        .get('/files/123/review')
        .expect(200);

      expect(res.body).to.deep.equal({
        file: { name: 'testFile', review: 'testReview' },
        fileMetadata: { metadata: 'testMetadata' },
        review: 'testReview',
      });
    });
  });

  describe('PUT /files/:fileId/review', () => {
    it('should return 404 if file is not found', async () => {
      findByIdStub.resolves(null);

      const res = await request(app)
        .put('/files/123/review')
        .send({ status: 'approved' })
        .expect(404);

      expect(res.text).to.equal('File not found');
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app)
        .put('/files/123/review')
        .send({ status: 'invalidStatus' })
        .expect(400);

      expect(res.text).to.equal('Invalid status');
    });

    it('should update file status and log moderation action', async () => {
      const file = { name: 'testFile', _id: '123', save: sinon.stub().resolves() };
      findByIdStub.resolves(file);
      saveStub.resolves();

      const res = await request(app)
        .put('/files/123/review')
        .send({ status: 'approved' })
        .expect(200);

      expect(file.save).to.have.been.calledOnce;
      expect(saveStub).to.have.been.calledOnce;
      expect(res.body.message).to.equal('File "testFile" has been approved');
    });

    it('should return 500 if an error occurs while updating file status', async () => {
      findByIdStub.resolves({ name: 'testFile', save: sinon.stub().rejects(new mongoose.Error('Database error')) });

      const res = await request(app)
        .put('/files/123/review')
        .send({ status: 'approved' })
        .expect(500);

      expect(res.text).to.equal('Error updating file status in database');
    });
  });
});
