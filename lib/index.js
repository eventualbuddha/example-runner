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
 * @param {function(string, string, string): string} transform
 * @param {EventEmitter} emitter
 * @param {?object} context
 */
function runTest(basename, filename, callback, transform, emitter, context) {
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
        source = transform(source, basename, filename);
      }

      if (typeof source !== 'string') {
        throw new Error('expected `source` to be a string, but got: ' + source);
      }

      var copiedContext = { assert: assert };
      for (var key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
          copiedContext[key] = context[key];
        }
      }

      vm.runInNewContext(source, copiedContext);
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
 * @param {?object} options
 * @return {EventEmitter}
 */
function run(files, options) {
  var args = parseRunArguments([].slice.call(arguments));
  files = args.files;
  options = args.options;

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
        options.transform,
        emitter,
        options.context
      );
    } else {
      done();
    }
  }

  function done() {
    emitter.emit('done', passed, failed);
  }

  files = files.slice();
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
 * @param {?(object|function)} options
 */
function runCLI(files, options) {
  var args = parseRunArguments([].slice.call(arguments));
  files = args.files;
  options = args.options;

  if (!files || files.length === 0) {
    findExampleFiles(function(err, files) {
      if (err) { throw err; }
      main(files, options);
    });
  } else {
    main(files, options);
  }
}

/**
 * @private
 */
function parseRunArguments(args) {
  var files = args[0];
  var options = args[1] || {};

  if (args.length === 1) {
    switch (Object.prototype.toString.call(files)) {
      case '[object Function]':
        options = { transform: files };
        files = null;
        break;

      case '[object Object]':
        options = files;
        files = null;
        break;
    }
  }

  return { files: files, options: options };
}

/**
 * @private
 */
function main(files, options) {
  run(files, options)
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
