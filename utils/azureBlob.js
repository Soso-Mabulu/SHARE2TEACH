const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerName = 'file-storage1'; // Replace with your container name

const s3Upload = async ({ originalname, buffer }) => {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();

        const blobName = path.basename(originalname);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const uploadBlobResponse = await blockBlobClient.uploadData(buffer);
        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading file to Azure Blob Storage:', error);
        throw error;
    }
};

module.exports = { s3Upload };
