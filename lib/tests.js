(function(){
  var gulpGfonts, gulp, gulpConcat, merge, gulpStylus, gulpDebug, through2, vinylBuffer, ref$, expect, assert, source, streamAssert, opts, streamShouldError, expectFilesCount, streamWithContent, testConfigStream;
  gulpGfonts = require('./index');
  gulp = require('gulp');
  gulpConcat = require('gulp-concat');
  merge = require('merge2');
  gulpStylus = require('gulp-stylus');
  gulpDebug = require('gulp-debug');
  through2 = require('through2');
  vinylBuffer = require('vinyl-buffer');
  ref$ = require('chai'), expect = ref$.expect, assert = ref$.assert;
  source = require('vinyl-source-stream');
  streamAssert = require('stream-assert');
  opts = function(it){
    return Object.assign({
      limitDownloads: 2
    }, it != null
      ? it
      : {});
  };
  streamShouldError = function(next, s){
    var errored, this$ = this;
    errored = {
      v: false,
      s: null,
      cnt: 0
    };
    return s.on('error', function(it){
      return it.bind(null, errored);
    }(function(errored){
      errored.v = true;
      return next();
    })).pipe(errored.s = through2.obj(function(it){
      console.log(it);
      return arguments[2]();
    }, function(it){
      return it.bind(null, errored, next);
    }(function(errored, next){
      expect(errored.v).equals(true);
      errored.s.emit('finish');
      return next();
    })));
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
  streamWithContent = function(name, content){
    var x$;
    x$ = source(name);
    x$.write(content);
    process.nextTick(bind$(x$, 'end'));
    return x$.pipe(vinylBuffer());
    return x$;
  };
  testConfigStream = function(it){
    return streamWithContent('test-gfontconf.json', JSON.stringify(it));
  };
  describe('gulp', function(___){
    this.timeout(2 * 1000);
    it('output css only and empty stream', function(done){
      return testConfigStream({
        Roboto: ['400', '100i']
      }).pipe(gulpGfonts(opts({
        fontsStream: function(it){
          return it.pipe(streamAssert.length(0)).on('assertion', function(){
            expect('num of files').equals(0);
          });
        },
        embed: true,
        formats: ['woff2']
      }))).pipe(streamAssert.length(1)).pipe(streamAssert.end(done));
    });
    it('failing options', function(done){
      return streamShouldError(done, testConfigStream({
        Roboto: ['400', '100i']
      }).pipe(gulpGfonts(opts({
        formats: 1
      }))));
    });
    it('output css and separate eot in ie8-compatible mode even in full embedded mode', function(done){
      return testConfigStream({
        Roboto: ['400']
      }).pipe(gulpGfonts(opts({
        fontsStream: function(it){
          return it.pipe(streamAssert.length(1)).on('assertion', function(){
            expect('num of files').equals(1);
          });
        },
        embed: false,
        formats: {
          eot: {
            embed: true
          },
          ttf: {
            embed: true
          }
        }
      }))).pipe(streamAssert.length(1)).pipe(streamAssert.end(done));
    });
    it('fonts-stream => stream vs next', function(done){
      streamShouldError(done, testConfigStream({
        Roboto: ['400']
      }).pipe(gulpGfonts(opts({
        fontsStream: function(s, next){
          return s.pipe(gulp.dest('../.tmp')).on('finish', next);
        },
        embed: true,
        noie8: true,
        formats: {
          eot: true
        }
      }))));
    });
    it('throw error if google responded error', function(done){
      streamShouldError(done, testConfigStream({
        Ro11boto: ['400']
      }).pipe(gulpGfonts(opts({}))));
    });
    it('output css and separate files', function(done){
      return testConfigStream({
        Roboto: ['400']
      }).pipe(gulpGfonts(opts({
        fontsStream: function(it, done){
          it.pipe(expectFilesCount(function(it){
            return it > 1;
          })).on('assertion', function(){
            expect('num of files').greater(1);
          }).pipe(gulp.dest('../.tmp')).on('end', function(){
            return done();
          });
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
      return testConfigStream({
        Roboto: ['400'],
        subset: ['cyrillic']
      }).pipe(gulpGfonts(opts({
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
        done();
      }).on('finish', function(){
        return done();
      });
    });
  });
  describe('processor', function(___){
    it('wrong format', function(){
      expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: 1
        }));
      }).to['throw']();
      expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: ['WRONG', 'FORMAT']
        }));
      }).to['throw']();
      expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: {
            WRONGFORMAT: true
          }
        }));
      }).to['throw']();
      expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: {
            woff2: true,
            eot: false,
            woff: {
              unknownKey: 'something'
            }
          }
        }));
      }).to.not['throw']();
      return expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: ['woff2', 'eot']
        }));
      }).to.not['throw']();
    });
    it('wrong input', function(){
      expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: ['woff2', 'eot']
        })).prepareInput('string' + [0, 1, 4, 6, 48].map(String.fromCharCode));
      }).to['throw']();
      expect(new gulpGfonts.Processor(opts({
        formats: ['woff2', 'eot']
      })).prepareInput('family=Roboto:500')).equal('family=Roboto:500');
      expect(new gulpGfonts.Processor(opts({
        formats: ['woff2', 'eot']
      })).prepareInput(JSON.stringify({
        Roboto: ['500', '100i'],
        'Open Sans': "100"
      }))).equal('family=Roboto:500,100i|Open+Sans:100');
      return expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: ['woff2', 'eot']
        })).prepareInput(JSON.stringify({
          Roboto: {},
          'Open Sans': "100"
        }));
      }).to['throw']();
    });
    return it('font weight', function(){
      expect(gulpGfonts.Processor.prepareFontWeight(400)).be.a('number').and.equal(400);
      expect(gulpGfonts.Processor.prepareFontWeight('200')).be.a('number').and.equal(200);
      expect(gulpGfonts.Processor.prepareFontWeight('Normal')).be.a('number').and.equal(400);
      expect(gulpGfonts.Processor.prepareFontWeight(160)).be.a('number').and.equal(100);
      return expect(gulpGfonts.Processor.prepareFontWeight('ikhjkj')).be.a('number').and.equal(400);
    });
  });
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
