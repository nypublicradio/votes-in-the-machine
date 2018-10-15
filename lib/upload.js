const AWS = require('aws-sdk');
const moment = require('moment-timezone');

const Bucket = process.env.RESULTS_BUCKET

async function uploadToS3(data, ops = {}) {
  if (!data) {
    return {ok: false, message: 'must provide data to upload'};
  }
  const s3 = new AWS.S3();
  const now = moment();

  let uploadOptions = {
    Bucket,
    Body: Buffer.from(JSON.stringify(data)),
    ACL: 'public-read',
    ContentType: 'application/json',
    CacheControl: 'no-cache,no-store,max-age=60',
    Key: `${ops.prefix}/timestamp/${now.format('YYYY-MM-DDTHH:mm:ssZ')}.json`
  };
  let result = {};

  // first timestamped results
  result.timestamp = await s3.putObject(uploadOptions).promise();

  // then with a static path
  result.static = await s3.putObject({
    ...uploadOptions,
    Key: `${ops.prefix}/results.json`
  }).promise();

  result.ok = true;
  return result;
}

module.exports = {
  uploadToS3
}
