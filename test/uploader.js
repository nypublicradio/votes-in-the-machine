const assert = require('assert');
const AWS = require('aws-sdk-mock');
const moment = require('moment');

const { uploadToS3 } = require('../lib/upload');

describe('uploader', function() {

  it('uploads to a timestamped path and a static path', async function() {
    let now = moment();
    let putSpy = AWS.mock('S3', 'putObject');

    await uploadToS3({}, {prefix: 'foo'});

    AWS.restore('S3');

    let dynamicCall = putSpy.stub.firstCall;
    let staticCall = putSpy.stub.secondCall;

    assert.ok(putSpy.stub.calledTwice);
    assert.equal(dynamicCall.args[0].Key, `foo/timestamp/${now.format('YYYY-MM-DD_HH-mm-ss')}.json`, 'static call');
    assert.equal(staticCall.args[0].Key, 'foo/results.json', 'static call');
  });

  it('returns an error if no data is supplied', async function() {
    let error = await uploadToS3();
    assert.deepEqual(error, {ok: false, message: 'must provide data to upload'});
  })
});
