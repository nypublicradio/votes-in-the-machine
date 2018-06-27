const aws = require('aws-sdk');
const chalk = require('chalk');

const cloudwatch = new aws.CloudWatchEvents();
const lambda = new aws.Lambda();

const { log } = console;

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

async function printDetails(rule) {
  try {
    let { Targets: [ target ] } = await cloudwatch.listTargetsByRule({Rule: rule.Name}).promise();
    let state = rule.State === 'DISABLED' ? chalk.bold.red(rule.State) : chalk.bold.green(rule.State);
    let config = JSON.stringify(JSON.parse(target.Input), null, '  ');

    log(chalk.bold.underline(rule.Name));
    log(`State: ${state}`);
    log('Schedule:', rule.ScheduleExpression);
    log('Event Config:', chalk.keyword('wheat')(config));

    return { rule, target };
  } catch(e) {
    log(chalk.red(e));
    process.exit(1);
  }
}


module.exports = {
  getRules,
  pickRulePrompt,
  printDetails
}
