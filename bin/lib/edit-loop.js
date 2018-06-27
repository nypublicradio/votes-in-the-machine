const chalk = require('chalk');
const inquirer = require('inquirer');

const { log } = console;

class EditLoop {
  constructor({ edit, messages = {} }) {
    this.edit = edit;
    this.keys = Object.keys(edit);
    this.messages = {
      chooseField: messages.chooseField || 'Choose a field.'
    }
  }

  async conduct() {
    return await this.beginLoop(this.edit);
  }

  async beginLoop(edit) {
    let { field } = await inquirer.prompt({
      type: 'list',
      name: 'field',
      message: this.messages.chooseField,
      choices: this.keys,
    });

    let { value } = await inquirer.prompt({
      type: 'input',
      name: 'value',
      message: `Update ${field}:`,
      default: edit[field]
    });

    let updated = {...edit, [field]: value};
    log(chalk.yellow(JSON.stringify(updated, null, '  ')));

    let { ok } = await inquirer.prompt({
      type: 'expand',
      name: 'ok',
      message: 'Looks ok?',
      choices: [{key: 'y', name: 'Yes', value: true}, {key: 'n', name: 'No, keep editing', value: false}],
      default: 0
    });

    if (ok) {
      return updated;
    } else {
      return await this.beginLoop(updated);
    }
  }

}

module.exports = EditLoop;
