# votes in the machine
a configurable daemon for polling the AP's election results API. results are cached to S3 for client retrieval.

## requirements
node 8.10
IAM role: votes-in-the-machine-role
Policy: votes-in-the-machine-policy
lambda: votes-in-the-machine-<env>
bucket: votes-in-the-machine-<env>

## ap client params
- race: string, internal identifier used for s3 path prefix
- date: `YYYY-MM-DD`, election date
- pollsCloseAt: `YYYY-MM-DD-HH-mm`
- statePostal: string
- test: boolean
- national: boolean
- party: string
- uncontested: boolean
- level: string
- includeRaces: array
- excludeRaces: array
