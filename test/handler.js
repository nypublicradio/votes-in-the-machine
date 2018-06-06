const assert = require('assert');
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');
const nock = require('nock');
const moment = require('moment-timezone');

const apMock = require('./fixtures/election.js');
const nextresults = require('./fixtures/nextresults.js');
const s3results = require('./fixtures/results.js');

const { handler } = require('../index.js');

describe('handler', function() {
  const testOptions = {
    date: '2018-11-08',
    statePostal: 'NY',
    test: true,
    national: true,
    race: 'race-slug'
  };

  let mockGetResponse;
  beforeEach(function() {
    mockGetResponse = {
      AcceptRanges: 'bytes',
      LastModified: '2018-06-06T14:47:15.000Z',
      ContentLength: 128,
      ETag: '"0a9b1f0fed2fb8eac237d199305298c1"',
      CacheControl: 'no-cache,no-store,max-age=60',
      ContentType: 'application/json',
      Expires: '1969-12-31T05:00:00.000Z',
      Metadata: {},
    };
  });

  afterEach(function() {
    nock.cleanAll();
    AWS.restore('S3');
  });

  it('it gets initial results from the ap endpoint', async function() {
    let getStub = sinon.stub().callsArgWith(1, {code: 'NoSuchKey'}, null);
    let putStub = sinon.stub().callsArgWith(1, null, null);
    AWS.mock('S3', 'putObject', putStub);
    AWS.mock('S3', 'getObject', getStub);

    nock(process.env.AP_RESULTS_HOST)
      .get(`/${process.env.AP_RESULTS_PATH}/${testOptions.date}`)
      .query(true)
      .reply(200, apMock);

    let response = await handler(testOptions);

    assert.ok(getStub.calledWith({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `${testOptions.race}/nextrequest.json`
    }), 'looks for the nextrequest key');

    assert.ok(putStub.calledWith({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `${testOptions.race}/nextrequest.json`,
      Body: Buffer.from(JSON.stringify({nextrequest: apMock.nextrequest})),
      ContentType: 'application/json',
      CacheControl: 'no-cache,no-store,max-age=60',
      ACL: 'public-read',
      Expires: moment('12/31/1969', 'MM/DD/YYYY').toDate()
    }), 'it caches the new next request value');

    assert.ok(putStub.calledWith({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `${testOptions.race}/timestamp/${moment().format('YYYY-MM-DD_HH-mm-ss')}.json`,
      Body: Buffer.from(JSON.stringify(response)),
      ACL: 'public-read',
      ContentType: 'application/json',
      CacheControl: 'no-cache,no-store,max-age=60',
    }), 'it uploads the results to the timestamp key');

    assert.ok(putStub.calledWith({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `${testOptions.race}/results.json`,
      Body: Buffer.from(JSON.stringify(response)),
      ACL: 'public-read',
      ContentType: 'application/json',
      CacheControl: 'no-cache,no-store,max-age=60',
    }), 'it uploads the results to the static key');
  });

  it('it updates existing results using `nexturl`', async function() {
    const NEXT_URL = 'http://example.com/next';
    let mockNextUrlResponse = {...mockGetResponse, Body: Buffer.from(JSON.stringify({nextrequest: NEXT_URL}))}; // S3 returns a buffer as the Body
    let resultsResponse = {...mockGetResponse, Body: Buffer.from(JSON.stringify(s3results))};

    let getStub = sinon.stub()
      .onFirstCall().callsArgWith(1, null, mockNextUrlResponse)
      .onSecondCall().callsArgWith(1, null, resultsResponse)

    let putStub = sinon.stub().callsArgWith(1, null, null);
    AWS.mock('S3', 'getObject', getStub);
    AWS.mock('S3', 'putObject', putStub);

    nock('http://example.com')
      .get('/next')
      .query(true)
      .reply(200, nextresults);

    let response = await handler(testOptions);

    assert.ok(getStub.calledWith({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `${testOptions.race}/nextrequest.json`
    }), 'pulls down nextrequest value');
    assert.ok(getStub.calledWith({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `${testOptions.race}/results.json`
    }), 'pulls down current results');

    assert.equal(putStub.callCount, 3, 'uploads new nextrequest value and updated results to s3');

    assert.equal(response.races.length, s3results.races.length);
  });

  it('throws if an election date is not specified')
});
