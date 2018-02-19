#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
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
  .option('-f, --format [format]', 'Used to take a screenshot of the page', 'file')
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

    console.log('Scan is started for:', chalk.yellow(username));
    if (_.isEmpty(options.restrictRules) === false) {
      console.log('Restricted the scan to rules:', chalk.cyan(options.restrictRules));
    }
    if (_.isEmpty(options.restrictCategories) === false) {
      console.log(
        'Restricted scan to categories:',
        chalk.cyan(options.restrictCategories)
      );
    }
    console.log('Requests timeout of', chalk.cyan(options.timeout / 1000), 'seconds.');
    console.log('\nThis operation may take a while so relax..');

    console.log('\nPress', chalk.red('[CTRL+C]'), 'to interrupt the scan.\n');
    console.time('Script execution time');

    // Run the scanner
    scanner(
      username,
      {
        output: options.output,
        capture: options.capture,
        restrict: options.restrictRules,
        restrictCategories: options.restrictCategories,
        timeout: options.timeout,
        screenshotOptions: {
          outputType: options.format
        }
      },
      (err, results) => {
        if (err) {
          console.log('An error occurred during the scan:');
          console.log(chalk.red(err));
          return;
        }

        // Extract the success and errors results
        let success = _.filter(results, { error: null });

        // Print the results to stdout
        console.log('The script has tested', chalk.cyan(results.length), 'rules.', '\n');

        // Quit with message if no positive results
        if (success.length === 0) {
          console.log(
            'The scan ended with',
            chalk.yellow('no positive results'),
            'for this username.\n'
          );
          console.timeEnd('Script execution time');
          return;
        }

        console.log(
          'The following',
          chalk.green(success.length, 'entries'),
          'produced a',
          chalk.green('positive'),
          'result: \n'
        );

        // Sort result categories alphabetically
        if (options.sort) {
          results = _.sortBy(results, 'name');
          success = _.sortBy(success, 'name');
        }

        // Print each entry
        success.forEach((r, i) => {
          console.log(` - ${r.name}:`.padEnd(16), r.address);
          if (i === success.length - 1) {
            console.log('');
          }
        });

        // Optionally save output to file
        if (options.output) {
          let fileName = `${Date.now()}.json`;
          let outputPath = path.join(options.output, fileName);
          console.log('Writing output to:', chalk.inverse(outputPath));

          try {
            fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
            console.log('File successfully saved to disk.', '\n');
          } catch (e) {
            console.log(chalk.red('ERROR: The file cannot be saved!'));
            console.log(chalk.red(e.message), '\n');
          }
        }

        // Print execution suggestions
        console.log(
          'You can also try with',
          chalk.yellow('different combinations'),
          'of characters or usernames.'
        );
        console.log(
          'Also if any of found results is',
          chalk.yellow('not reliable'),
          'you can report it on GitHub.\n'
        );

        // Print issue example
        console.log(chalk.cyan('What I need to do to report false positives?'));
        console.log('Open a new issue containing as title: INVALID RULE: <RuleName>.');
        console.log('As body specify why the result is invalid, in case is not obvious.');
        console.log('For example invalid urls or characters, lazy loaded pages, etc..');
        console.log('The rule will be fixed and updated in the next versions.\n');

        // Print script execution time
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
      console.log('There are', chalk.yellow('no rules'), 'that match this categories.');
      return;
    }

    // Print total rules and categories count
    console.log(
      'There are',
      chalk.green(rules.length, 'rules'),
      'within',
      chalk.green(categories.length, 'categories'),
      'available right now.'
    );

    // Print restricted results informations
    if (options.categories.length > 0) {
      console.log(
        'There are',
        chalk.green(filteredRules.length, 'rules'),
        'under the categories:',
        chalk.cyan(options.categories),
        '\n'
      );
    }

    // Sort result categories alphabetically
    if (options.sort) {
      filteredRules = _.sortBy(filteredRules, 'name');
    }

    // Print the grouped rules
    filteredRules.forEach(r => {
      console.log(' - Name:'.padEnd(12), r.name);
      console.log('   Address:'.padEnd(12), r.url);
      console.log('   Category:'.padEnd(12), r.category);
      console.log('');
    });

    // Print extra information message
    console.log(
      'To scan only',
      chalk.cyan('specific categories'),
      'use the',
      chalk.cyan('restrict'),
      'options.'
    );
  });

// Extend help message with examples
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
