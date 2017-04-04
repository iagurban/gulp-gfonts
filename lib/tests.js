(function(){
  var gulpGfonts, gulp, gulpConcat, merge, gulpStylus, gulpDebug, through2, ref$, expect, assert, streamAssert, opts, streamShouldError, expectFilesCount;
  gulpGfonts = require('./index');
  gulp = require('gulp');
  gulpConcat = require('gulp-concat');
  merge = require('merge2');
  gulpStylus = require('gulp-stylus');
  gulpDebug = require('gulp-debug');
  through2 = require('through2');
  ref$ = require('chai'), expect = ref$.expect, assert = ref$.assert;
  streamAssert = require('stream-assert');
  opts = function(it){
    return Object.assign({
      limitDownloads: 2
    }, it != null
      ? it
      : {});
  };
  streamShouldError = function(){
    return through2.obj(function(){
      return arguments[2]();
    }, function(){
      return expect('not got this point').equals(true);
    });
  };
  expectFilesCount = function(cmp){
    return Object.assign(through2.obj(function(f, e, n){
      ++this.__o.v;
      n();
    }, function(n){
      if (!this.__o.cmp(this.__o.v)) {
        this.emit('assertion', this.__o.v);
      }
      n();
    }), {
      __o: {
        v: 0,
        cmp: cmp
      }
    });
  };
  describe('embedding', function(___){
    this.timeout(2 * 1000);
    it('output css only and empty stream', function(done){
      return gulp.src('').pipe(gulpGfonts(opts({
        query: 'family=Roboto:400',
        fontsStream: function(it){
          return it.pipe(streamAssert.length(0)).on('assertion', function(){
            expect('num of files').equals(0);
          }).pipe(gulp.dest('../.tmp'));
        },
        embed: true,
        formats: {
          woff2: true
        }
      }))).pipe(streamAssert.length(1)).pipe(streamAssert.end(done));
    });
    it('output css and separate eot in ie8-compatible mode even in full embedded mode', function(done){
      return gulp.src('').pipe(gulpGfonts(opts({
        query: 'family=Roboto:400',
        fontsStream: function(it){
          return it.pipe(streamAssert.length(1)).on('assertion', function(){
            expect('num of files').equals(1);
          }).pipe(gulp.dest('../.tmp'));
        },
        embed: true,
        formats: {
          woff2: true,
          eot: true
        }
      }))).pipe(streamAssert.length(1)).pipe(streamAssert.end(done));
    });
    it('fonts-stream => stream vs next', function(done){
      return gulp.src('').pipe(gulpGfonts(opts({
        query: 'family=Roboto:400',
        fontsStream: function(s, next){
          return s.pipe(gulp.dest('../.tmp')).on('end', next);
        },
        embed: true,
        noie8: true,
        formats: {
          eot: true
        }
      }))).on('error', function(){
        return done();
      }).pipe(streamShouldError());
    });
    it('throw error if google responded error', function(done){
      return gulp.src('').pipe(gulpGfonts(opts({
        query: 'family=Ro11boto:400',
        formats: {
          woff2: true
        }
      }))).on('error', function(){
        return done();
      }).pipe(streamShouldError());
    });
    it('output css and separate files', function(done){
      return gulp.src('').pipe(gulpGfonts(opts({
        query: 'family=Roboto:400',
        fontsStream: function(it){
          return it.pipe(expectFilesCount(function(it){
            return it > 1;
          })).on('assertion', function(){
            expect('num of files').greater(1);
          }).pipe(gulp.dest('../.tmp'));
        },
        embed: false,
        formats: {
          woff2: true,
          woff: true,
          svg: true
        }
      }))).pipe(streamAssert.length(1)).pipe(streamAssert.end(done));
    });
    return it('output all', function(done){
      this.timeout(30 * 1000);
      return gulp.src('').pipe(gulpGfonts(opts({
        query: 'family=Roboto:400&subset=cyrillic',
        embed: false,
        formats: {
          woff2: true,
          svg: true,
          eot: true
        }
      }))).pipe(expectFilesCount(function(it){
        return it > 4;
      })).on('assertion', function(){
        expect('num of files').greater(4);
      }).pipe(gulp.dest('../.tmp')).on('end', function(){
        return done();
      });
    });
  });
}).call(this);
