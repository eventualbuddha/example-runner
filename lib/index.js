var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var vm = require('vm');
var assert = require('assert');

/**
 * Runs the test for the given source files, printing the results and calling
 * the callback with the success status of the test.
 *
 * @param {string} basename
 * @param {string} filename
 * @param {function(boolean)} callback
 * @param {function(string): string} transform
 * @param {EventEmitter} emitter
 */
function runTest(basename, filename, callback, transform, emitter) {
  /**
   * Notifies the callback that we were unsuccessful and prints the error info.
   *
   * @param {Error} err
   * @private
   */
  function error(err) {
    callback(false, err);
  }

  fs.readFile(filename, 'utf8', function(err, source) {
    if (err) { return error(err); }

    try {
      if (transform) {
        source = transform(source);
      }

      if (typeof source !== 'string') {
        throw new Error('expected `source` to be a string, but got: ' + source);
      }
      vm.runInNewContext(source, { assert: assert });
      callback(true);
    } catch (ex) {
      error(ex);
    }
  });
}

/**
 * Runs the given test files and calls back with the results, or an error if
 * one occurred.
 *
 * @param {Array.<string>} files
 * @param {?function(string): string} transform
 * @param {function(?err, ?results)} callback
 * @return {EventEmitter}
 */
function run(files, transform) {
  var passed = [];
  var failed = [];
  var emitter = new EventEmitter();

  function next() {
    var filename = files.shift();
    var testName = path.basename(filename, '.js');
    if (filename) {
      runTest(
        testName,
        filename,
        function(success, error) {
          emitter.emit(success ? 'pass' : 'fail', testName, error);
          (success ? passed : failed).push(testName);
          next();
        },
        transform,
        emitter
      );
    } else {
      done();
    }
  }

  function done() {
    emitter.emit('done', passed, failed);
  }

  next();
  return emitter;
}

/**
 * Prints a line to stdout for the given test indicating that it passed.
 *
 * @param {string} testName
 */
function printSuccess(testName) {
  console.log('✓ ' + testName);
}

/**
 * Prints a line to stdout for the given test indicating that it failed. In
 * addition, prints any additional information indented one level.
 *
 * @param {string} testName
 * @param {Error} error
 */
function printFailure(testName, error) {
  console.log('✘ ' + testName);
  console.log();
  console.log(error.stack);
}

/**
 * Runs the given tests and source transform, exiting with an appropriate
 * status code. If no files are provided then all files matching
 * `test/examples/*.js` will be run. If no transform is provided then the
 * source will be used as read from the file.
 *
 * @param {?Array.<string>} files
 * @param {?function(string):string} transform
 */
function runCLI(files, transform) {
  if (arguments.length === 1) {
    if (typeof files === 'function') {
      transform = files;
      files = null;
    }
  }

  if (!files || files.length === 0) {
    findExampleFiles(function(err, files) {
      if (err) { throw err; }
      main(files, transform);
    });
  } else {
    main(files, transform);
  }
}

/**
 * @private
 */
function main(files, transform) {
  run(files, transform)
    .on('pass', printSuccess)
    .on('fail', printFailure)
    .on('done', function(passed, failed) {
      console.log();
      console.log(
        '%d total, %d passed, %d failed.',
        passed.length + failed.length,
        passed.length,
        failed.length
      );
      process.exit(failed.length ? 1 : 0);
    });
}

/**
 * Finds all files matching `test/examples/*.js`.
 *
 * @param {function(?Error, ?Array.<string>)} callback
 * @private
 */
function findExampleFiles(callback) {
  var base = 'test/examples';
  fs.readdir(base, function(err, files) {
    if (err) {
      callback(err);
    } else {
      callback(
        null,
        files.filter(function(file) {
          return path.extname(file) === '.js';
        }).map(function(file) {
          return path.join(base, file);
        })
      );
    }
  });
}

exports.run = run;
exports.runCLI = runCLI;
