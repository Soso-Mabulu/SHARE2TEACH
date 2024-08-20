const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

console.log('Azure Storage Account Name:', process.env.AZURE_STORAGE_ACCOUNT_NAME);
console.log('Azure Storage Account Key:', process.env.AZURE_STORAGE_ACCOUNT_KEY ? 'Loaded' : 'Not Loaded');

// Azure Blob Storage Client Configuration
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

// Replace with your container name
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

module.exports = { blobServiceClient, containerClient };
