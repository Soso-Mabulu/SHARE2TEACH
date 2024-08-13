const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuid } = require('uuid');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.s3Upload = async (file) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${uuid()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        const upload = new Upload({
            client: s3Client,
            params,
        });

        const data = await upload.done();
        return data.Location;
    } catch (error) {
        throw new Error(`File upload failed: ${error.message}`);
    }
};

