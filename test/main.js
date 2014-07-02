var cjsxPlugin  = require('../');
var should     = require('should');
var cjsx       = require('coffee-react');
var gutil      = require('gulp-util');
var fs         = require('fs');
var path       = require('path');
var sourcemaps = require('gulp-sourcemaps');
var stream     = require('stream');
var _          = require('lodash');
require('mocha');

var createFile = function (filepath, contents) {
  var base = path.dirname(filepath);
  return new gutil.File({
    path: filepath,
    base: base,
    cwd: path.dirname(base),
    contents: contents
  });
}

describe('gulp-cjsx', function() {
  describe('cjsx()', function() {
    before(function() {
      this.testData = function (expected, newPath, done) {
        var newPaths = [newPath],
            expectedSourceMap;

        if (expected.v3SourceMap) {
          expectedSourceMap = JSON.parse(expected.v3SourceMap);
          expected = [expected.js];
        } else {
          expected = [expected];
        }

        return function (newFile) {
          this.expected = expected.shift();
          this.newPath = newPaths.shift();

          should.exist(newFile);
          should.exist(newFile.path);
          should.exist(newFile.relative);
          should.exist(newFile.contents);
          newFile.path.should.equal(this.newPath);
          newFile.relative.should.equal(path.basename(this.newPath));
          String(newFile.contents).should.equal(this.expected);

          if (expectedSourceMap) {
            // check whether the sources from the coffee have been
            // applied to the files source map
            newFile.sourceMap.sources
              .should.containDeep(expectedSourceMap.sources);
          }

          if (done && !expected.length) {
            done.call(this);
          }
        }
      };
    });

    it('should concat two files', function(done) {
      var filepath = "/home/contra/test/file.coffee";
      var contents = new Buffer("a = 2");
      var opts = {bare: true};
      var expected = cjsx.compile(String(contents), opts);

      cjsxPlugin(opts)
        .on('error', done)
        .on('data', this.testData(expected, "/home/contra/test/file.js", done))
        .write(createFile(filepath, contents));
    });

    it('should emit errors correctly', function(done) {
      var filepath = "/home/contra/test/file.coffee";
      var contents = new Buffer("if a()\r\n  then huh");

      cjsxPlugin({bare: true})
        .on('error', function(err) {
          err.message.indexOf(filepath).should.not.equal(-1);
          done();
        })
        .on('data', function(newFile) {
          throw new Error("no file should have been emitted!");
        })
        .write(createFile(filepath, contents));
    });

    var tests = [{
      type: '*.coffee',
      source: 'test/fixtures/grammar.coffee',
      sourceFile: 'grammar.coffee',
      dest: 'test/fixtures/grammar.js',
      destFile: 'grammar.js'
    }, {
      type: '*.cjsx',
      source: 'test/fixtures/react.cjsx',
      sourceFile: 'react.cjsx',
      dest: 'test/fixtures/react.js',
      destFile: 'react.js'
    }]

    _.forEach(tests, function(test){
      var filepath = test.source;
      var contents = new Buffer(fs.readFileSync(filepath));

      it('should compile a file (no bare) | ' + test.type, function(done) {
        var expected = cjsx.compile(String(contents));

        cjsxPlugin()
          .on('error', done)
          .on('data', this.testData(expected, test.dest, done))
          .write(createFile(filepath, contents));
      });

      it('should compile a file (with bare) | ' + test.type, function(done) {
        var opts = {bare: true};
        var expected = cjsx.compile(String(contents), opts);

        cjsxPlugin(opts)
          .on('error', done)
          .on('data', this.testData(expected, test.dest, done))
          .write(createFile(filepath, contents));
      });

      it('should compile a file with source map | ' + test.type, function(done) {
        var expected = cjsx.compile(String(contents), {
          sourceMap: true,
          sourceFiles: [test.sourceFile],
          generatedFile: test.destFile
        });

        var stream = sourcemaps.init();
        stream.write(createFile(filepath, contents))
        stream
          .pipe(cjsxPlugin({}))
            .on('error', done)
            .on('data', this.testData(expected, test.dest, done));
      });

      it('should compile a file with bare and with source map | ' + test.type, function(done) {
        var expected = cjsx.compile(String(contents), {
          bare: true,
          sourceMap: true,
          sourceFiles: [test.sourceFile],
          generatedFile: test.destFile
        });

        var stream = sourcemaps.init();
        stream.write(createFile(filepath, contents));
        stream
          .pipe(cjsxPlugin({bare: true}))
            .on('error', done)
            .on('data', this.testData(expected, test.dest, done));
      });

      it('should compile a file (no header) | ' + test.type, function(done) {
        var expected = cjsx.compile(String(contents), {header: false});

        cjsxPlugin()
          .on('error', done)
          .on('data', this.testData(expected, test.dest, done))
          .write(createFile(filepath, contents));
      });

      it('should compile a file (with header) | ' + test.type, function(done) {
        var expected = cjsx.compile(String(contents), {header: true});

        cjsxPlugin({header: true})
          .on('error', done)
          .on('data', this.testData(expected, test.dest, done))
          .write(createFile(filepath, contents));
      });
    });

    it('should compile a literate file', function(done) {
      var filepath = "test/fixtures/journo.litcoffee";
      var contents = new Buffer(fs.readFileSync(filepath));
      var opts = {literate: true};
      var expected = cjsx.compile(String(contents), opts);

      cjsxPlugin(opts)
        .on('error', done)
        .on('data', this.testData(expected, "test/fixtures/journo.js", done))
        .write(createFile(filepath, contents));
    });

    it('should compile a literate file (implicit)', function(done) {
      var filepath = "test/fixtures/journo.litcoffee";
      var contents = new Buffer(fs.readFileSync(filepath));
      var expected = cjsx.compile(String(contents), {literate: true});

      cjsxPlugin()
        .on('error', done)
        .on('data', this.testData(expected, "test/fixtures/journo.js", done))
        .write(createFile(filepath, contents));
    });

    it('should compile a literate file (with bare)', function(done) {
      var filepath = "test/fixtures/journo.litcoffee";
      var contents = new Buffer(fs.readFileSync(filepath));
      var opts = {literate: true, bare: true};
      var expected = cjsx.compile(String(contents), opts);

      cjsxPlugin(opts)
        .on('error', done)
        .on('data', this.testData(expected, "test/fixtures/journo.js", done))
        .write(createFile(filepath, contents));
    });

    it('should compile a literate file with source map', function(done) {
      var filepath = "test/fixtures/journo.litcoffee";
      var contents = new Buffer(fs.readFileSync(filepath));
      var expected = cjsx.compile(String(contents), {
        literate: true,
        sourceMap: true,
        sourceFiles: ['journo.litcoffee'],
        generatedFile: 'journo.js'
      });

      var stream = sourcemaps.init();
      stream.write(createFile(filepath, contents));
      stream
        .pipe(cjsxPlugin({literate: true}))
          .on('error', done)
          .on('data', this.testData(expected, "test/fixtures/journo.js", done))
    });

    it('should compile a literate file with bare and with source map', function(done) {
      var filepath = "test/fixtures/journo.litcoffee";
      var contents = new Buffer(fs.readFileSync(filepath));
      var expected = cjsx.compile(String(contents), {
        literate: true,
        bare: true,
        sourceMap: true,
        sourceFiles: ['journo.litcoffee'],
        generatedFile: 'journo.js'
      });

      var stream = sourcemaps.init();
      stream.write(createFile(filepath, contents));
      stream
        .pipe(cjsxPlugin({literate: true, bare: true}))
          .on('error', done)
          .on('data', this.testData(expected, "test/fixtures/journo.js", done));
    });
  });
});
