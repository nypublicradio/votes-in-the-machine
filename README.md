# votes in the machine
a configurable daemon for polling the AP's election results API. results are cached to S3 for client retrieval.

## requirements
node 8.10
IAM role: votes-in-the-machine-role
Policy: votes-in-the-machine-policy
lambda: votes-in-the-machine-<env>
bucket: votes-in-the-machine-<env>
