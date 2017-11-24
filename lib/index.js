#!/usr/bin/env node

'use strict';

const pkg = require('../package.json');
const scanner = require('social-scanner');
const _ = require('lodash');
const commander = require('commander');

/**
 * Sort an object properties by his keys values alphabetically
 * @param  {object} object The object to sort
 * @return {object}        The object with properties sorted by key alphabetically
 */
const sortByKeys = object => {
  const keys = Object.keys(object);
  const sortedKeys = _.sortBy(keys);
  return _.fromPairs(_.map(sortedKeys, key => [key, object[key]]));
};

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

    v${pkg.version} by ${pkg.author.name} <${pkg.author.email}>

`);

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

    console.log('Scanning for:', username);
    console.time('Script execution time');
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
          console.log('An error occurred while scanning:');
          console.log(err);
          return;
        }

        // Print the results to stdout
        console.log('Scanned', results.length, 'social networks.');
        console.timeEnd('Script execution time');

        // Extract the success and errors results
        let success = _.filter(results, { error: false });
        let errors = _.difference(results, success);

        // If any output the errors
        if (errors.length) {
          console.log(`\nThe following ${errors.length} entries produced an error:\n`);
          errors.forEach(r => {
            console.log(' -', r.name);
          });
        }

        // If any output the success entries
        if (success.length) {
          console.log(`\nA valid match has been found for ${success.length} entries:\n`);
          success.forEach(r => {
            console.log(' -', r.name);
          });
          console.log('\nThis a starting point to go deeper.\n');
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
  .description('List all the available social networks.')
  .option(
    '-g, --groups [list]',
    'Comma separated list of social networks groups',
    val => val.split(','),
    []
  )
  .option('-s, --sort', 'Sort the result alphabetically')
  .action(options => {
    // Exit with error if groups option get parsed wrong
    // since it can cause the malfunction of the action logic
    if (typeof options.groups === 'undefined') {
      throw new Error(
        'Bad value for groups option, be sure there are no spaces between groups.'
      );
    }

    // Get the scanne rules
    let rules = scanner.getRules();

    // Group rules by category property
    let groupedRules = _.groupBy(rules, 'category');

    // Filter groups to return only ones that match
    if (Array.isArray(options.groups) && options.groups.length > 0) {
      groupedRules = options.groups.reduce((obj, g) => {
        if (Object.prototype.hasOwnProperty.call(groupedRules, g)) {
          obj[g] = groupedRules[g];
        }
        return obj;
      }, {});
    }

    // Exit with a message if there are no rules
    if (Object.keys(groupedRules).length === 0) {
      console.log(
        `There are no rules that match this groups: [${options.groups.join(',')}].\n`
      );
      return;
    }

    console.log(
      `There are ${rules.length} total rules right now in ${
        Object.keys(groupedRules).length
      } categories.\n`
    );

    // Sort result groups alphabetically
    if (options.sort) {
      groupedRules = sortByKeys(groupedRules);
    }

    // Print the grouped rules
    Object.keys(groupedRules).forEach(function(key) {
      // Get the rules array
      let groupRules = groupedRules[key];

      // Sort result group rules alphabetically
      if (options.sort) {
        groupRules = _.sortBy(groupRules, 'name');
      }

      console.log('Category:', key);
      console.log('=============================================\n');
      groupRules.forEach(r => {
        console.log(' - Name:', r.name);
        console.log('   Url:', r.url, '\n');
      });
    });
  });

// Parse arguments
commander.parse(process.argv);
