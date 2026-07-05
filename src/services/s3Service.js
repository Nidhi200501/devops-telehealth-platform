const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }),
});

const bucketName = process.env.S3_BUCKET_NAME || 'telehealth-assets';

/**
 * Upload a file to S3
 * @param {string} key - S3 object key (path)
 * @param {Buffer|Stream} body - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<object>} Upload result with Location URL
 */
const uploadFile = async (key, body, contentType = 'application/octet-stream') => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    };

    const result = await s3.upload(params).promise();
    logger.info('File uploaded to S3', { key, location: result.Location });
    return result;
  } catch (error) {
    logger.error('S3 upload failed', { key, error: error.message });
    throw error;
  }
};

/**
 * Download a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>} File content
 */
const downloadFile = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    const result = await s3.getObject(params).promise();
    logger.info('File downloaded from S3', { key });
    return result.Body;
  } catch (error) {
    logger.error('S3 download failed', { key, error: error.message });
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
const deleteFile = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    logger.info('File deleted from S3', { key });
  } catch (error) {
    logger.error('S3 delete failed', { key, error: error.message });
    throw error;
  }
};

/**
 * Generate a pre-signed URL for temporary access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiry in seconds (default 3600)
 * @returns {string} Pre-signed URL
 */
const getSignedUrl = (key, expiresIn = 3600) => {
  try {
    const url = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: key,
      Expires: expiresIn,
    });
    return url;
  } catch (error) {
    logger.error('Failed to generate signed URL', { key, error: error.message });
    throw error;
  }
};

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
  getSignedUrl,
};
