const { version: cliVersion, author } = require('../package.json');
const { version } = require('social-scanner/package.json');

module.exports = `
                                       d8b
                         8P            88P
                                      d88
  .d888b, d8888b  d8888b  88b d888b8b  888
  ?8b,   d8P' ?88d8P'     88Pd8P' ?88  ?88
    ?8b 88b  d8888b     d88 88b  ,88b  88b
  ?888P'  ?8888P' ?888P'd88'  ?88P' 88b  88b

  .d888b, d8888b d888b8b    88bd88b   88bd88b  d8888b  88bd88b
  ?8b,   d8P'  Pd8P' ?88    88P' ?8b  88P' ?8bd8b_,dP  88P'
    ?8b 88b    88b  ,88b  d88   88P d88   88P88b     d88
  ?888P'  ?888P' ?88P' 88bd88'   88bd88'   88b ?888P'd88'

  Cli: v${cliVersion}   Module: v${version}

  Author: ${author.name} <${author.email}>
`;
