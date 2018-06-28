const aws = require('aws-sdk');
const chalk = require('chalk');
const inquirer = require('inquirer');

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

async function verifyRule(rule) {
  let { Rules } = await cloudwatch.listRules({NamePrefix: rule}).promise();
  if (Rules.length > 1) {
    log(chalk.yellow('More than one election monitor configuration found.'));
    return await chooseRulePrompt(Rules);
  } else if (Rules.length === 1) {
    return Rules[0];
  } else {
    log(chalk.red('No election monitors found for name "%s"'), rule);
    process.exit();
  }
}


async function chooseRulePrompt(rules) {
  let pickARule = {
    type: 'list',
    name: 'rule',
    message: 'Choose an election monitor.',
    choices: rules.map(r => ({
      name: `${r.Name}: ${r.State}`,
      value: r
    }))
  };
  let { rule } = await inquirer.prompt(pickARule);
  return rule;
}

async function printDetails(rule) {
  try {
    let { Targets: [ target ] } = await cloudwatch.listTargetsByRule({Rule: rule.Name}).promise();
    let state = rule.State === 'DISABLED' ? chalk.bold.red(rule.State) : chalk.bold.green(rule.State);

    log(chalk.bold.underline(rule.Name));
    log(`State: ${state}`);
    log('Schedule:', rule.ScheduleExpression);
    if (target) {
      let config = JSON.stringify(JSON.parse(target.Input), null, '  ');
      log('Lambda:', target.Arn);
      log('Election Monitor Config:', chalk.keyword('wheat')(config));
    } else {
      log(chalk.keyword('wheat')('No target lambda configured'));
    }

    return { rule, target };
  } catch(e) {
    log(chalk.red(e));
    process.exit(1);
  }
}


module.exports = {
  getRules,
  chooseRulePrompt,
  printDetails,
  verifyRule
}
