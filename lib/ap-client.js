const request = require('request-promise-native');
const AWS = require('aws-sdk');
const moment = require('moment-timezone');

const Bucket = process.env.RESULTS_BUCKET

// follow WNYC newsroom styleguide
moment.updateLocale('en', {
  meridiem: function(hour/*, minute, isLowerCase*/) {
    if (hour < 12) {
      return 'a.m.';
    } else {
      return 'p.m.';
    }
  }
});

class APClient {
  constructor(ops) {
    this.host = process.env.AP_RESULTS_HOST;
    this.path = process.env.AP_RESULTS_PATH;
    this.race = ops.race;

    this.date         = ops.date;
    this.pollsCloseAt = ops.pollsCloseAt;
    this.party        = ops.party;
    this.statePostal  = ops.statePostal;
    this.national     = ops.national;
    this.level        = ops.level;
    this.uncontested  = ops.uncontested;
    this.test         = ops.test;
    this.includeRaces = ops.includeRaces || [];
    this.excludeRaces = ops.excludeRaces || [];
  }

  async nextRequest() {
    const s3 = new AWS.S3();

    let ops = {
      Bucket,
      Key: `${this.race}/nextrequest.json`
    };

    try {
      let { Body } = await s3.getObject(ops).promise();
      let data = JSON.parse(Body.toString());
      return data.nextrequest;
    } catch(e) {
      if (e.code === 'NoSuchKey') {
        return null;
      } else {
        throw e
      }
    }
  }

  async fetchResults() {
    let { date, party, statePostal, national, level, uncontested, test, host, path } = this;
    let ops = {
      uri: `${host}/${path}/${date}`,
      qs: {
        party,
        statePostal,
        national,
        level,
        uncontested,
        test,
        format: 'json',
        apikey: process.env.AP_API_KEY
      },
      json: true
    }
    let response = await request(ops);

    await this.cacheNextRequest(response.nextrequest);

    return this.processResponse(response);
  }

  async fetchCachedResults() {
    const s3 = new AWS.S3();

    let getOps = {
      Bucket,
      Key: `${this.race}/results.json`
    };

    let { Body } = await s3.getObject(getOps).promise();
    return JSON.parse(Body.toString());
  }

  async mergeResults(nexturl) {
    let response = await request({uri: nexturl, json: true, qs: {apikey: process.env.AP_API_KEY}});
    if (!response.races.length) {
      return false;
    }
    let processedDelta = this.filterByRace(response.races).map(this.mungeRace);
    let currentResults = await this.fetchCachedResults();

    processedDelta.forEach(race => {
      let currentResult = currentResults.races.find(r => r.raceID === race.raceID);
      let index = currentResults.races.indexOf(currentResult);
      currentResults.races.splice(index, 1, race);
    });

    await this.cacheNextRequest(response.nextrequest);

    return currentResults;
  }

  cacheNextRequest(nextrequest) {
    const s3 = new AWS.S3();

    let uploadOptions = {
      Bucket,
      Body: Buffer.from(JSON.stringify({nextrequest})),
      ACL: 'public-read',
      ContentType: 'application/json',
      CacheControl: 'no-cache,no-store,max-age=60',
      Key: `${this.race}/nextrequest.json`,
      Expires: moment('12/31/1969', 'MM/DD/YYYY').toDate()
    };
    return s3.putObject(uploadOptions).promise();
  }

  processResponse(data) {
    let now = moment();
    let output = {
      lastUpdated: `${now.format('h:mm a')} ET`,
      pollsClosed: now.diff(moment(this.pollsCloseAt, 'YYYY-MM-DD-HH-mm'), 'minutes') >= 0,
      races: data.races
    }

    output.races = this.filterByRace(data.races);
    output.races = output.races.map(this.mungeRace);

    return output;
  }

  filterByRace(races) {
    if (this.includeRaces.length) {
      return races
        .filter(race => this.includeRaces.map(Number).includes(Number(race.raceID)))
    } else if (this.includeRaces.length || this.excludeRaces.length) {
      return races
        .filter(race => !this.excludeRaces.map(Number).includes(Number(race.raceID)))
    } else {
      return races;
    }
  }

  mungeRace(race) {

    let { raceID, officeName, seatName, seatNum, description, numWinners } = race;

    let results = {
      raceID,
      officeName,
      seatName,
      numWinners,
      description,
      seatNum: Number(seatNum) || null,
    }

    if (race.reportingUnits) {
      let stateLevelInfo = race.reportingUnits.find(ru => ru.level === 'state'); // for top level info
      let { precinctsReporting, precinctsTotal } = stateLevelInfo;
      let totalVotes = sum(stateLevelInfo.candidates.map(c => c.voteCount));
      let candidates = stateLevelInfo.candidates.sort(byVotesByName);

      results = {
        ...results,
        precinctsReporting,
        precinctsTotal,
        totalVotes,
        candidates,
      };
    } else {
      results.candidates = race.candidates;
    }

    return results;
  }
}

function sum(array) {
  return array.reduce((a, b = 0) => a + b, 0);
}

function byVotesByName(a, b) {
  if (a.winner) {
    return -1;
  }

  if (b.winner) {
    return 1;
  }

  if (a.voteCount !== b.voteCount) {
    return b.voteCount - a.voteCount;
  }

  if (a.last !== b.last) {
    return a.last.toLowerCase() < b.last.toLowerCase() ? -1 : 1;
  }

  return a.first < b.first ? -1 : 1;
}

module.exports = APClient;
