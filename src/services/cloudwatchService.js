const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }),
});

const cloudwatch = new AWS.CloudWatch();
const cloudwatchLogs = new AWS.CloudWatchLogs();

const logGroupName = process.env.CLOUDWATCH_GROUP || '/telehealth/app';
const logStreamName = process.env.CLOUDWATCH_STREAM || `app-${Date.now()}`;

let sequenceToken = null;
let initialized = false;

/**
 * Initialize CloudWatch log group and stream
 */
const initializeCloudWatch = async () => {
  if (process.env.NODE_ENV === 'test' || !process.env.AWS_ACCESS_KEY_ID) {
    logger.info('CloudWatch disabled (test mode or no AWS credentials)');
    return;
  }

  try {
    // Create log group if it doesn't exist
    try {
      await cloudwatchLogs.createLogGroup({ logGroupName }).promise();
      logger.info('CloudWatch log group created', { logGroupName });
    } catch (err) {
      if (err.code !== 'ResourceAlreadyExistsException') throw err;
    }

    // Create log stream
    try {
      await cloudwatchLogs
        .createLogStream({ logGroupName, logStreamName })
        .promise();
      logger.info('CloudWatch log stream created', { logStreamName });
    } catch (err) {
      if (err.code !== 'ResourceAlreadyExistsException') throw err;
    }

    initialized = true;
  } catch (error) {
    logger.error('Failed to initialize CloudWatch', {
      error: error.message,
    });
  }
};

/**
 * Send custom metric to CloudWatch
 */
const putMetric = async (metricName, value, unit = 'Count', dimensions = []) => {
  if (!initialized) return;

  try {
    await cloudwatch
      .putMetricData({
        Namespace: 'TeleHealth/Application',
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: [
              {
                Name: 'Environment',
                Value: process.env.NODE_ENV || 'development',
              },
              ...dimensions,
            ],
          },
        ],
      })
      .promise();
  } catch (error) {
    logger.error('Failed to put CloudWatch metric', {
      metricName,
      error: error.message,
    });
  }
};

/**
 * Send log event to CloudWatch
 */
const putLogEvent = async (message) => {
  if (!initialized) return;

  try {
    const params = {
      logGroupName,
      logStreamName,
      logEvents: [
        {
          message: typeof message === 'string' ? message : JSON.stringify(message),
          timestamp: Date.now(),
        },
      ],
      ...(sequenceToken && { sequenceToken }),
    };

    const result = await cloudwatchLogs.putLogEvents(params).promise();
    sequenceToken = result.nextSequenceToken;
  } catch (error) {
    logger.error('Failed to put CloudWatch log event', {
      error: error.message,
    });
    // Reset token on error
    sequenceToken = null;
  }
};

module.exports = {
  initializeCloudWatch,
  putMetric,
  putLogEvent,
};
