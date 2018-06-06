const APClient = require('./lib/ap-client');
const { uploadToS3 } = require('./lib/upload');
const moment = require('moment-timezone');

moment.tz.setDefault('America/New_York');

exports.handler = async params => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(params); // eslint-disable-line
  }
  const ap = new APClient(params);
  const { race } = params;

  let nextrequestUrl = await ap.nextRequest();

  let response;
  if (nextrequestUrl) {
    let updatedResults = await ap.mergeResults(nextrequestUrl);
    if (updatedResults) {
      response = await uploadToS3(updatedResults, {prefix: race});
      if (process.env.NODE_ENV !== 'test') {
        console.log('success:', response); // eslint-disable-line
      }
      return updatedResults;
    }
  } else {
    let newResults = await ap.fetchResults();
    response = await uploadToS3(newResults, {prefix: race});
    if (process.env.NODE_ENV !== 'test') {
      console.log('success:', response); // eslint-disable-line
    }
    return newResults;
  }
}
