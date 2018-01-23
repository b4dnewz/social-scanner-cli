#!/usr/bin/env node

'use strict';

const _ = require('lodash');
const scanner = require('social-scanner');
const commander = require('commander');
const { name, description, version, author } = require('social-scanner/package.json');

// Print the banner
console.log(`
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

    v${version} by ${author.name} <${author.email}>
`);

// Set program details
commander
  .version(version)
  .name(name)
  .description(description);

// The scan action
commander
  .command('scan <username>')
  .description('Scan a given username against module entries.')
  .option('-o, --output <path>', 'Where to save the output files')
  .option('-c, --capture', 'When to take a screenshot of the page')
  .option(
    '-t, --timeout <milliseconds>',
    'Milliseconds to wait before killing the screenshot',
    v => parseInt(v, 10),
    2000
  )
  .option(
    '-r, --restrict-categories [list]',
    'Comma separated list of categories',
    val => val.split(','),
    []
  )
  .option(
    '-R, --restrict-rules [list]',
    'Comma separated list of rule names',
    val => val.split(','),
    []
  )
  .action((username, options) => {
    // Exit with error if timeout is not a number
    if (isNaN(options.timeout)) {
      throw new Error(`Invalid timeout option value: ${options.timeout}`);
    }

    // Exit with error if restrict options is undefined
    // otherwise it will break the script that expects a valid array
    if (typeof options.restrictRules === 'undefined') {
      throw new Error(
        'Bad value for restrict option, be sure there are no spaces between values.'
      );
    }

    console.log('Scan is started for:', username, '\n');

    // Print some options details
    if (!_.isEmpty(options.restrict)) {
      console.log('Restricted the scan to rules:', options.restrict);
    }
    if (!_.isEmpty(options.restrictCategories)) {
      console.log('Restricted scan to categories:', options.restrictCategories);
    }
    if (options.timeout) {
      console.log('Requests timeout set to', options.timeout / 1000, 'seconds.');
    }

    console.log('\nPress [CTRL+C] to interrupt the scan.\n');
    console.time('Script execution time');
    scanner(
      username,
      {
        output: options.output,
        capture: options.capture,
        restrict: options.restrict,
        restrictCategories: options.restrictCategories,
        timeout: options.timeout
      },
      (err, results) => {
        if (err) {
          console.log('An error occurred while scanning:');
          console.log(err);
          return;
        }

        // Extract the success and errors results
        let success = _.filter(results, { error: null });

        // Print the results to stdout
        console.log(
          'The scan ended successfully with',
          results.length,
          'entries scanned.'
        );

        // If any output the success entries
        if (success.length) {
          console.log(
            `The following ${success.length} results has produced a good match:\n`
          );

          // Print each entry
          success.forEach(r => console.log(` - ${r.name}: ${r.address}`, '\n'));
          console.log('You could also try other combinations of characters.\n');
          console.log('If any result is not reliable, you can report it on GitHub.\n');

          console.log("What I've to do?");
          console.log('Open a new issue containing as title: INVALID RULE: <RuleName>.');
          console.log(
            'As body specify why the result is invalid, in case is not obvious.'
          );
          console.log('For example invalid urls or characters, lazy loaded pages, etc..');
          console.log('The rule will be fixed and updated in the next versions.\n');
        } else {
          console.log('\nThe scan ended with no positive results.');
          console.log('You could also try other combinations of characters.');
        }

        console.timeEnd('Script execution time');
      }
    );
  });

// Print all the available rule entries
commander
  .command('list')
  .description('List all the available social networks.')
  .option(
    '-c, --categories [list]',
    'Comma separated list of categories',
    val => val.split(','),
    []
  )
  .option('-s, --sort', 'Sort the result alphabetically')
  .action(options => {
    // Exit with error if categories option get parsed wrong
    // since it can cause the malfunction of the action logic
    if (typeof options.categories === 'undefined') {
      throw new Error(
        'Bad value for categories option, be sure there are no spaces between categories.'
      );
    }

    // Get the scanne rules
    let rules = scanner.getRules();
    let filteredRules = _.clone(rules);
    let categories = _.chain(rules)
      .map(r => r.category)
      .flatten()
      .uniq()
      .value();

    // Filter categories to return only ones that match
    if (Array.isArray(options.categories) && options.categories.length > 0) {
      filteredRules = rules.filter(r => {
        return _.intersection(r.category, options.categories).length;
      });
    }

    // Exit with a message if there are no rules
    if (_.isEmpty(filteredRules)) {
      console.log(
        'There are no rules that match this categories:',
        `[${options.categories.join(', ')}].\n`
      );
      return;
    }

    console.log(
      `There are ${rules.length} rules in ${categories.length} categories.`,
      '\n'
    );
    console.log(
      `Found ${filteredRules.length} rules with categories:`,
      `[${options.categories.join(', ')}]`,
      '\n'
    );

    // Sort result categories alphabetically
    if (options.sort) {
      filteredRules = _.sortBy(filteredRules, 'name');
    }

    // Print the grouped rules
    filteredRules.forEach(r => {
      console.log(' - Name:', r.name);
      console.log('   Url:', r.url);
      console.log('   Category:', r.category);
      console.log('\n');
    });
  });

// Parse arguments
commander.parse(process.argv);
