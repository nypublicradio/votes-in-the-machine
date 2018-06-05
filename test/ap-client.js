const assert = require('assert');
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');
const nock = require('nock');
const moment = require('moment');

const APClient = require('../lib/ap-client.js');

const resultsMock = require('./fixtures/election.js');

describe('ap client', function() {
  const testOptions = {
    date: '2018-11-08',
    statePostal: 'NY',
    test: true,
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
    let apServer, ap, putSpy;

    beforeEach(function() {
      ap = new APClient(testOptions);
      apServer = nock(ap.host).get(`/${ap.path}/${ap.date}`).query(true).reply(200, resultsMock).persist();
      putSpy = AWS.mock('S3', 'putObject');
    });

    afterEach(function() {
      nock.cleanAll();
      AWS.restore('S3');
    });

    it('hits the AP backend', async function() {
      await ap.fetchResults();
      assert.ok(apServer.isDone());
    });

    it('saves nextrequest after fetching from AP backend', async function() {
      let { nextrequest } = resultsMock;

      await ap.fetchResults();

      assert.ok(putSpy.stub.calledOnce, 'was called');
      assert.ok(putSpy.stub.calledWith({
        Bucket: process.env.RESULTS_BUCKET,
        Key: `${ap.race}/nextrequest.json`,
        Body: Buffer.from(JSON.stringify({nextrequest})),
        ContentType: 'application/json',
        CacheControl: 'no-cache,no-store,max-age=60',
        ACL: 'public-read',
        Expires: moment('12/31/1969', 'MM/DD/YYYY').toDate()
      }), 'expected args');

    });

    it('adds some additonal metadata to the result set', async function() {
      let now = moment();
      let results = await ap.fetchResults();

      assert.equal(results.lastUpdated, `${now.format('h:mm a')} ET`);
      assert.ok(!results.pollsClosed, 'should report polls are open')

      ap.pollsCloseAt = now.clone().subtract(60, 'minutes');

      results = await ap.fetchResults();
      assert.ok(results.pollsClosed, 'should report polls are closed');
    });

    it('filters and excludes races', async function() {
      let results = await ap.fetchResults();

      assert.equal(results.races.length, resultsMock.races.length, 'pull all races if unspecified');

      ap.includeRaces = ["31206", 31214];
      results = await ap.fetchResults();
      assert.equal(results.races.length, 2, 'includes specified races; can mix types');

      ap.includeRaces = [];
      ap.excludeRaces = ["31206", 31214];
      results = await ap.fetchResults();
      assert.equal(results.races.length, 3, 'exludes specified races; can mix types');
    });

    it('pulls out top level race data', async function() {
      let results = await ap.fetchResults();
      let expectedKeys = ['raceID', 'officeName', 'seatName', 'description', 'precinctsReporting', 'precinctsTotal', 'totalVotes', 'candidates', 'seatNum', 'numWinners'].sort();

      results.races.forEach(race => assert.deepEqual(expectedKeys, Object.keys(race).sort()));
    });

    it('sorts candidates by vote then by name', async function() {
      let resultsCopy = JSON.parse(JSON.stringify(resultsMock));

      // winner first, then vote count, then last name, then first name
      let { candidates } = resultsCopy.races[0].reportingUnits[0];
      candidates[2].winner = 'X';
      candidates[0].voteCount = 1000;
      candidates[1].last = 'Foo';
      candidates[3].last = 'Foo';
      candidates[3].voteCount = 500;

      nock.cleanAll();
      nock(ap.host).get(`/${ap.path}/${ap.date}`).query(true).reply(200, resultsCopy);
      let results = await ap.fetchResults();
      let [ race ] = results.races;

      assert.equal(race.candidates[0].candidateID, candidates[2].candidateID);
      assert.equal(race.candidates[1].candidateID, candidates[0].candidateID);
      assert.equal(race.candidates[2].candidateID, candidates[3].candidateID);
      assert.equal(race.candidates[3].candidateID, candidates[1].candidateID);
    });
  });
});
