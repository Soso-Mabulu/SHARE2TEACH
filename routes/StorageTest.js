const { BlobServiceClient } = require('@azure/storage-blob');

describe('Azure Blob Storage Upload', () => {
  let mockBlobServiceClient;

  beforeEach(() => {
    mockBlobServiceClient = jest.fn().mockReturn({
      getContainerClient: jest.fn(),
    });
  });

  it('should upload file to Azure Blob Storage successfully', async () => {
    const uploadDataMock = jest.fn().mockResolvedValue(undefined);
    const containerClientMock = { getBlockBlobClient: jest.fn().mockReturn({ uploadData: uploadDataMock }) };
    mockBlobServiceClient.mockReturnValue({ getContainerClient: jest.fn().mockReturnValue(containerClientMock) });

    await uploadFileToBlob('test-id', 'file-data');

    expect(uploadDataMock).toHaveBeenCalledWith('file-data');
  });

  it('should throw error on upload failure', async () => {
    const uploadDataMock = jest.fn().mockRejectedValue(new Error('Upload failed'));
    const containerClientMock = { getBlockBlobClient: jest.fn().mockReturn({ uploadData: uploadDataMock }) };
    mockBlobServiceClient.mockReturnValue({ getContainerClient: jest.fn().mockReturnValue(containerClientMock) });

    await expect(uploadFileToBlob('test-id', 'file-data')).rejects.toThrow('Upload failed');
  });
});