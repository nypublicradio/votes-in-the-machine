const APClient = require('./lib/ap-client');
const { uploadToS3 } = require('./lib/upload');
const moment = require('moment');

exports.handler = async params => {
  const ap = new APClient(params);
  const { race } = params;

  let nextrequest = await ap.nextRequest();

  let currentResults;
  if (nextrequest) {
    currentResults = await ap.mergeResults(nextrequest);
  } else {
    currentResults = await ap.fetchResults();
  }

  let response = await uploadToS3(currentResults, {prefix: race});
  console.log('success:', response);
}
