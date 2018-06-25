const aws = require('aws-sdk');

const cloudwatch = new aws.CloudWatchEvents();
const lambda = new aws.Lambda();

const DEMO_LAMBDA = 'votes-in-the-machine-demo';
const PROD_LAMBDA = 'votes-in-the-machine-prod';

async function getRules(env) {
  let { Rules } = await cloudwatch.listRules().promise();
  if (!env) {
    return Rules;
  } else {
    let FunctionName = env === 'demo' ? DEMO_LAMBDA : PROD_LAMBDA;
    let { Configuration: { FunctionArn }} = await lambda.getFunction({ FunctionName }).promise();
    let { RuleNames } = await cloudwatch.listRuleNamesByTarget({ TargetArn: FunctionArn }).promise();
    return Rules.filter(rule => RuleNames.includes(rule.Name));
  }
}

function pickRulePrompt(rules, message) {
  let question = {
    type: 'list',
    name: 'rule',
    message: message,
    choices: rules.map(r => ({
      name: `${r.Name}: ${r.State}`,
      value: r
    }))
  };
  return question;
}

module.exports = {
  getRules,
  pickRulePrompt
}
