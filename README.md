# votes in the machine
A configurable daemon for polling the AP's election results API. Results are cached to S3 for client retrieval. This is designed to execute as a Lambda function in response to CloudWatch Events configured using a JSON constant with [parameters outlined below](#daemon-params)

## requirements
node 8.10
- IAM role: votes-in-the-machine-role
- Policy: votes-in-the-machine-policy
 - S3:PutObject
 - S3:PutObjectACL
 - S3:GetObject
 - S3:ListBucket
- lambda: votes-in-the-machine-`<env>`
- bucket: votes-in-the-machine-`<env>`

## daemon params
These parameters are passed into the lambda function as the first parameter. These mostly map one-to-one with the parameters outlined in the [AP's docs](http://customersupport.ap.org/doc/AP_Elections_API_Developer_Guide.pdf). More information and additional parameters can be found at that link.

name | type |  description
--- | --- | --- | ---
`race` | `String` | internal identifier used for S3 path prefix to store results
`date` | `String` in format `YYYY-MM-DD` | election date, required for AP API
`pollsCloseAt` | `String` in format `YYYY-MM-DD-HH-mm` | Controls `pollsClosed` field in results
`statePostal` | `String` | Two-letter state code
`test` | `Boolean` | retrieve results test mode
`national` | `Boolean` | Filters races based on whether they are national or not
`party` | `String` | Party abbreviation. Multiple values must be separated by commas
`uncontested` | `Boolean` | Filters races based on whether they are contested or not
`level` | `String` | Determines granularity of the returned races
`includeRaces` | `Array[Number]` | Races to include (optional)
`excludeRaces` | `Array[Number]` | Races to exclude (optional)

## development
This app was bootstrapped with `node-lambda` and can execute a test event with the `run` command. It will pass in the contents of `event.json` as the first parameter.

```
$ npm i
$ npx node-lambda run
```

## testing
Tests are located in `test/` and run with `$ npm test`. This app uses `mocha` as a test framework. There are fixtures that are loaded from `test/fixtures` to mimic responses from the AP and post-processed data for assertions.

## deployment
CircleCI will deploy the master branch to demo infrastructure and tagged releases to production. `node-lambda` handles zipping and shipping the code to the lambda function. There are a few envvars required for running, defined in the confusing `deploy.env`.

name | description
--- | ---
`AP_API_KEY` | Secret token issued by the AP to access api results
`AP_RESULTS_HOST` | Protocol and hostname of the AP's endpoint
`AP_RESULTS_PATH` | Path name for the elections endpoint (separate from host to help with testing)
`RESULT_BUCKET` | Destination bucket in which to save results

Local deployments are also possible with the correct envvars set, defined in `.env`:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ENVIRONMENT`
- `AWS_ROLE_ARN`
- `AWS_REGION`
- `AWS_FUNCTION_NAME`
