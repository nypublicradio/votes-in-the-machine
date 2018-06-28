const chalk = require('chalk');
const inquirer = require('inquirer');

const { log } = console;

const EDIT = 'edit';
const ADD = 'add';
const DELETE = 'delete';
const FIELD_CHOICES =  {
  [EDIT]: 'Edit',
  [ADD]: 'Add',
  [DELETE]: 'Delete', // not supported yet
};

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
    let action = await this.chooseAction();

    let updated = await this.takeAction(action, edit);
    log(chalk.yellow(JSON.stringify(updated, null, '  ')));

    let { ok } = await inquirer.prompt({
      type: 'expand',
      name: 'ok',
      message: 'Save changes or continue editing?',
      choices: [{key: 's', name: 'Save', value: true}, {key: 'c', name: 'Continue editing', value: false}],
      default: 0
    });

    if (ok) {
      return updated;
    } else {
      return await this.beginLoop(updated);
    }
  }

  async chooseAction() {
    let { action } = await inquirer.prompt({
      type: 'expand',
      name: 'action',
      message: 'Add, edit, or delete a field?',
      choices: [
        {key: 'a', name: FIELD_CHOICES[ADD], value: ADD},
        {key: 'e', name: FIELD_CHOICES[EDIT], value: EDIT},
        {key: 'd', name: FIELD_CHOICES[DELETE], value: DELETE},
      ],
    });
    return action;
  }

  takeAction(action, edit) {
    switch(action) {
    case EDIT:
      return this._doEdit(edit);
    case ADD:
      return this._doAdd(edit);
    case DELETE:
      return this._doDelete(edit);
    }
  }

  async _doEdit(edit) {
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

    return {...edit, [field]: value};
  }

  async _doAdd(edit) {
    let { key, value } = await inquirer.prompt([{
      type: 'input',
      name: 'key',
      message: 'Set the key:'
    }, {
      type: 'input',
      name: 'value',
      message: 'Set the value:'
    }]);

    let updated = {...edit, ...{[key]: value}};
    if (key in edit) {
      let { overwrite } = await inquirer.prompt({
        type: 'expand',
        name: 'overwrite',
        message: `Key "${key}" already exists with value "${edit[key]}". Overwrite?`,
        choices: [{name: 'Yes', value: true, key: 'y'}, {name: 'No', value: false, key: 'n'}],
        default: 1
      });

      if (overwrite) {
        return updated;
      } else {
        log(chalk.yellow('Retaining original value.'));
        return edit;
      }
    } else {
      return updated;
    }
  }

  async _doDelete(edit) {
    let { field } = await inquirer.prompt({
      type: 'list',
      name: 'field',
      message: 'Choose a field to delete.',
      choices: this.keys
    });

    delete edit[field];
    return edit;
  }

}

module.exports = EditLoop;
