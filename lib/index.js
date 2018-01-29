#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const commander = require('commander');
const scanner = require('social-scanner');
const { name, description, version } = require('social-scanner/package.json');

// Print the banner
console.log(require('./banner'));

// Set program details
commander
  .version(version)
  .name(name)
  .description(description);

// The scan action
commander
  .command('scan <username>')
  .description('Scan a given username against module entries.')
  .option('-s, --sort', 'Sort results alphabetically')
  .option('-o, --output <path>', 'The path to the output directory')
  .option('-c, --capture', 'Used to take a screenshot of the page')
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

    console.log('Scan is started for:', username);
    console.log('This operation may take a while so relax..', '\n');

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
    if (options.capture) {
      console.log('Results screenshots will be captured to file.');
    }

    console.log('\nPress [CTRL+C] to interrupt the scan.\n');
    console.time('Script execution time');
    scanner(
      username,
      {
        output: options.output,
        capture: options.capture,
        restrict: options.restrictRules,
        restrictCategories: options.restrictCategories,
        timeout: options.timeout,
        screenshotOptions: {
          outputType: 'file',
          onlySuccess: true,
          crop: true
        }
      },
      (err, results) => {
        if (err) {
          console.log('An error occurred during the scan:');
          console.log(err);
          return;
        }

        // Extract the success and errors results
        let success = _.filter(results, { error: null });

        // Print the results to stdout
        console.log('The script scanned', results.length, 'entries.', '\n');

        // If any output the success entries
        if (success.length) {
          console.log(
            `The following ${success.length} entries has produced a good match:\n`
          );

          // Sort results alphabetically
          if (options.sort) {
            results = _.sortBy(results, 'name');
            success = _.sortBy(success, 'name');
          }

          // Print each entry
          success.forEach(r => {
            console.log(` - ${r.name}:`.padEnd(12), r.address, '\n');
          });
          console.log('You could also try other combinations of characters.\n');

          // Optionally save output to file
          if (options.output) {
            let fileName = `${username}_${Date.now()}.json`;
            let outputPath = path.join(options.output, fileName);
            console.log(
              'Writing scan results to:',
              `${options.output}/${fileName}`,
              '\n'
            );

            try {
              fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
              console.log('File successfully saved to disk.', '\n');
            } catch (e) {
              console.log('ERROR: The file cannot be saved!');
              console.log(e.message, '\n');
            }
          }

          // Print extra informations
          console.log('If any result is not reliable, you can report it on GitHub.\n');

          // Print issue example
          console.log("What I've to do to report it?");
          console.log('Open a new issue containing as title: INVALID RULE: <RuleName>.');
          console.log(
            'As body specify why the result is invalid, in case is not obvious.'
          );
          console.log('For example invalid urls or characters, lazy loaded pages, etc..');
          console.log('The rule will be fixed and updated in the next versions.\n');
        } else {
          console.log('The scan ended with no positive results.');
          console.log('You could also try other combinations of characters.');
        }

        console.timeEnd('Script execution time');
      }
    );
  });

// Print all the available rule entries
commander
  .command('list')
  .description('List all the available website rules.')
  .option('-s, --sort', 'Sort results alphabetically')
  .option(
    '-c, --categories [list]',
    'Comma separated list of categories',
    val => val.split(','),
    []
  )
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
      console.log(' - Name:'.padEnd(12), r.name);
      console.log('   Address:'.padEnd(12), r.url);
      console.log('   Category:'.padEnd(12), r.category);
      console.log('\n');
    });
  });

commander.on('--help', function() {
  console.log('');
  console.log('  Examples:');
  console.log('');
  console.log('    $ social-scanner -h');
  console.log('    $ social-scanner --help');
  console.log('');
  console.log('    $ social-scanner list -s -c tech');
  console.log('    $ social-scanner scan -r tech TARGET');
  console.log('    $ social-scanner scan -R github -o ./output TARGET');
  console.log('');
});

// Parse arguments
commander.parse(process.argv);
