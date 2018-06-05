const APClient = require('./lib/ap-client');
const { uploadToS3 } = require('./lib/upload');
const moment = require('moment');

exports.handler = async params => {
  const ap = new APClient(params);
  const { race } = params;

  let nextrequestUrl = await ap.nextRequest();

  let response;
  if (nextrequestUrl) {
    let updatedResults = await ap.mergeResults(nextrequestUrl);
    if (updatedResults) {
      response = await uploadToS3(updatedResults, {prefix: race});
      console.log('success:', response);
      return updatedResults;
    }
  } else {
    let newResults = await ap.fetchResults();
    response = await uploadToS3(newResults, {prefix: race});
    console.log('success:', response);
    return newResults;
  }
}
