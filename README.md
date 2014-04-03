# example-runner

Run example files with assertions. example-runner can be used as a very basic
test runner, optionally with a source transform function. This makes it
suitable for testing JavaScript-to-JavaScript compilers such as
[es6-class][es6-class], where it is used.

## Install

```
$ npm install [--save-dev] example-runner
```

## Usage

example-runner has two exported functions: `run` and `runCLI`. Most of the time
you'll probably want to use `runCLI` which prints to stdout and exits with the
appropriate status code. If you need to customize the output or exit behavior
of example-runner, such as to fit it into another tool, you can use `run`.

### runCLI(files, transform)

With no arguments, `runCLI` will run `test/examples/*.js`.

```js
require('example-runner').runCLI();
```

You can run specific files if you want:

```js
require('example-runner').runCLI(['a.js', 'b.js']);
```

Provide a transform if you want to modify your examples before running, such as
with [sweet.js][sweet.js]:

```js
require('example-runner').runCLI(function(source) {
  return sweetjs.compile(source);
});
```

### run(files, transform)

Like `runCLI()`, `run()` takes files and an optional transform function. Unlike
`runCLI()` it returns an `EventEmitter` that emits three events:

* `pass(testName)`: called when an example file passes
* `fail(testName, error)`: called when an example file fails, along with the
  error thrown
* `done(passed, failed)`: called when all tests have run, along with the
  names of the passed and failed examples

[es6-class]: https://github.com/square/es6-class
[sweet.js]: http://sweetjs.org/
