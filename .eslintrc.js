module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  "extends": "eslint:recommended",
  "rules": {
    "indent": [
      "error",
      2
    ]
  },
  globals: {
    it: true,
    describe: true,
    beforeEach: true,
    afterEach: true
  }
};
