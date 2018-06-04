const request = require('request');
const AWS = require('aws-sdk');

const Bucket = process.env.RESULTS_BUCKET

class APClient {
  constructor(ops) {
    this.base = process.env.AP_RESULTS_ENDPOINT;

    this.race = ops.race;
    this.date = ops.date;
    this.statePostal = ops.statePostal;
    this.test = ops.test;
    this.national = ops.national;
  }

  nextRequest() {
    const s3 = new AWS.S3();

    let ops = {
      Bucket,
      Key: `${this.race}/nextrequest.json`
    };

    return s3.getObject(ops).promise()
      .then(({nextrequest}) => nextrequest)
      .catch(e => {
        if (e.code === 'NoSuchKey') {
          return null;
        } else {
          throw e
        }
      });
  }

  fetchResults() {

  }
}

module.exports = APClient;
