const mongoose = require('mongoose');

describe('File Upload Route', () => {
  let mockSave, mockUpload;

  beforeEach(() => {
    mockSave = jest.fn().mockResolvedValue({ _id: 'test-id' });
    mockUpload = jest.fn().mockResolvedValue(undefined);

    const File = mongoose.model('File', {});
    File.prototype.save = mockSave;

    const uploadFileToBlob = jest.fn().mockImplementation(mockUpload);

    const app = {
      post: jest.fn((path, handler) => handler({ body: { name: 'test-file', fileData: 'data' } }, { status: jest.fn(), json: jest.fn(), send: jest.fn() })),
    };

    const handler = require('./filePath')(app, uploadFileToBlob, File); //File path of the file being uploaded
    handler();
  });

  it('should save file to database and upload to Azure Blob Storage', async () => {
    expect(mockSave).toHaveBeenCalled();
    expect(mockUpload).toHaveBeenCalledWith('test-id', 'data');
    expect(app.post).toHaveBeenCalledWith('/files', expect.anyFunction());
  });

  it('should return 500 on upload error', async () => {
    mockUpload.mockRejectedValue(new Error('Upload failed'));
    await expect(app.post).toHaveBeenCalledWith('/files', expect.anyFunction());
    expect(app.post.mock.calls[0][1]({}, { status: expect.anyFunction(), send: expect.anyFunction() })).toHaveBeenCalledWith(
      expect.anyObject(),
      { status: 500, send: 'Internal server error' }
    );
  });
});