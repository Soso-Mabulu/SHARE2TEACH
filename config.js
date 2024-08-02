const { S3Client } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-providers');
require('dotenv').config();

console.log('AWS Region:', process.env.AWS_REGION);
console.log('AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'Loaded' : 'Not Loaded');
console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'Loaded' : 'Not Loaded');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

module.exports = s3;
