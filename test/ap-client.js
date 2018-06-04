const assert = require('assert');
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');

const APClient = require('../lib/ap-client.js');

describe('ap client', function() {
  const testOptions = {
    date: '2018-11-08',
    statePostal: 'NY', test: true,
    national: true,
    race: 'race-slug'
  };

  it('intializes with parameters', function() {
    const ap = new APClient(testOptions);
    assert.equal(ap.date, '2018-11-08');
    assert.equal(ap.statePostal, 'NY');
    assert.equal(ap.test, true);
    assert.equal(ap.national, true);
    assert.equal(ap.race, 'race-slug');
    assert.equal(ap.base, process.env.AP_RESULTS_ENDPOINT);
  });

  describe('.nextRequest()', function() {

    it('checks the correct path', async function() {
      let spy = sinon.stub().callsArgWith(1, null, {nextrequest: 'foo.com'});
      AWS.mock('S3', 'getObject', spy);

      const ap = new APClient(testOptions);
      let nextrequest = await ap.nextRequest();

      AWS.restore('S3');

      assert.equal(nextrequest, 'foo.com');
      assert.ok(spy.calledWith({
        Bucket: process.env.RESULTS_BUCKET,
        Key: `${testOptions.race}/nextrequest.json`
      }));
    });

    it('returns null if no delta information is found', async function() {
      let spy = sinon.stub().callsArgWith(1, null, {code: 'NoSuchKey'});
      AWS.mock('S3', 'getObject', spy);

      const ap = new APClient(testOptions);
      let nextrequest = await ap.nextRequest();

      AWS.restore('S3');

      assert.equal(nextrequest, null);
    });

    it('throws for other errors', async function() {
      let spy = sinon.stub().callsArgWith(1, null, {});
      AWS.mock('S3', 'getObject', spy);
      const ap = new APClient(testOptions);

      try {
        await ap.nextRequest();
      } catch(e) {
        assert.ok('throws');
      } finally {
        AWS.restore('S3');
      }
    });
  });

  describe('.mergeResults()', function() {

    it('combines the response from nextResults with latest cachedResults');

  });

  describe('.cachedResults()', function() {
    it('gets the most recent result set from the bucket');
  });

  describe('.fetchResults()', function() {
    it('hits the AP backend and does some light processing');
    // saves nextrequest after fetching from the AP backend
    // lastUpdated
    // output.lastUpdated = timestamp.format("h:mm a") + " ET";
    // pollsClosed
    // output.pollsClosed = timestamp.diff(moment("2017-09-12-21-00", "YYYY-MM-DD-HH-mm"), "minutes") >= 0 || !!process.env.POLLS_CLOSED;
    // pick for supplied raceIDs
    // isContested option
    // pull top level race data: totalVotes, precinctsReporting, precinctsTotal, raceID, officeName, seatName, seatNum, description, numWinners
    // sort candidates by vote then by name
    // include proposals options
  })
});
