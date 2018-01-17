#!/usr/bin/env node

'use strict';

const _ = require('lodash');
const pkg = require('../package.json');
const commander = require('commander');
const scanner = require('social-scanner');
const utils = require('./utils');

// Print the banner
console.log(require('./banner'));

// Set program details
commander
  .version(pkg.version)
  .name('social-scanner')
  .description(pkg.description);

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
    '-r, --restrict [list]',
    'Comma separated list of social networks to scan',
    val => val.split(','),
    []
  )
  .option(
    '--categories [list]',
    'Comma separated list of rule categories to scan',
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
    if (typeof options.restrict === 'undefined') {
      throw new Error(
        'Bad value for restrict option, be sure there are no spaces between values.'
      );
    }

    console.log('Scan started for:', username);
    if (options.categories) {
      console.log('Scan is limited to categories:', `[${options.categories.join(',')}]`);
    }
    console.log('\nThis operation may take a while so relax..', '\n');

    // Run the scanner
    scanner(
      username,
      {
        output: options.output,
        capture: options.capture,
        restrict: options.restrict,
        timeout: options.timeout
      },
      (err, results) => {
        if (err) {
          console.log('An error occurred during the scan:');
          console.log(err);
          return;
        }

        // Print the results to stdout
        console.log('Scanned', results.length, 'social networks.\n');

        // Extract the success and errors results
        let success = _.filter(results, { error: false });
        let errors = _.difference(results, success);

        // If any output the errors
        if (errors.length) {
          console.log(
            `There was ${errors.length} entries that produced invalid response.`
          );
        }

        // If any output the success entries
        if (success.length) {
          console.log(`A valid match has been found for ${success.length} entries:\n`);
          success.forEach(r => {
            console.log(' -', r.name);
          });
          console.log('\nThis a starting point to go deeper.');
        } else {
          console.log('\nThe scan has terminated with no positive results.');
          console.log(
            'You should try with a different username or different patterns for the same username.'
          );
        }
      }
    );
  });

// Print all the available rule entries
commander
  .command('list')
  .description('List all the available website rules.')
  .option(
    '-c, --categories [list]',
    'Comma separated list of rule categories',
    val => val.split(','),
    []
  )
  .option('-s, --sort', 'Sort the result alphabetically')
  .action(options => {
    // Exit with error if groups option get parsed wrong
    // since it can cause the malfunction of the action logic
    if (typeof options.categories === 'undefined') {
      throw new Error(
        'Bad value for categories option, be sure there are no spaces between categories.'
      );
    }

    // Get the scanne rules
    let rules = scanner.getRules();

    // Group rules by category property
    let groupedRules = _.groupBy(rules, 'category');
    let ruleCategories = Object.keys(groupedRules);

    // Filter groups to return only ones that match
    if (Array.isArray(options.categories) && options.categories.length > 0) {
      groupedRules = utils.reduceObject(groupedRules, options.categories);
    }

    // Exit with a message if there are no rules
    if (_.isEmpty(groupedRules)) {
      return console.log(
        `There are no rules that match this groups: [${options.categories.join(',')}].\n`
      );
    }

    // Print total count of rules and categories
    console.log(
      `There are ${rules.length} total rules in ${ruleCategories.length} categories.\n`
    );

    console.log(
      `Found ${_.flatten(Object.values(groupedRules)).length} rules in ${
        Object.keys(groupedRules).length
      } categories:\n`
    );

    // Sort rules alphabetically
    if (options.sort) {
      groupedRules = utils.sortObjectKeys(groupedRules);
    }

    _.forEach(groupedRules, function(rules, key) {
      if (options.sort) {
        rules = _.sortBy(rules, 'name');
      }

      console.log('Category:', key);
      console.log('=============================================\n');
      rules.forEach(r => {
        console.log(' - Name:', r.name);
        console.log('   Url:', r.url, '\n');
      });
    });
  });

// Parse arguments
commander.parse(process.argv);
