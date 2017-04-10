(function(){
  var gulpGfonts, gulp, gulpConcat, merge, gulpStylus, gulpDebug, gulpHydra, through2, vinylBuffer, ref$, expect, assert, source, Stream, Readable, streamAssert, opts, _sse, streamShouldError, streamShouldNotError, gulpStreamExpect, expectFilesCount, streamWithContent, testConfigStream, multidone, split;
  gulpGfonts = require('./index');
  gulp = require('gulp');
  gulpConcat = require('gulp-concat');
  merge = require('merge2');
  gulpStylus = require('gulp-stylus');
  gulpDebug = require('gulp-debug');
  gulpHydra = require('gulp-hydra');
  through2 = require('through2');
  vinylBuffer = require('vinyl-buffer');
  ref$ = require('chai'), expect = ref$.expect, assert = ref$.assert;
  source = require('vinyl-source-stream');
  Stream = require('stream'), Readable = Stream.Readable;
  streamAssert = require('stream-assert');
  opts = function(it){
    return Object.assign({
      limitDownloads: 2
    }, it != null
      ? it
      : {});
  };
  _sse = function(val, next, s){
    var t, this$ = this;
    t = {
      errored: false
    };
    s.on('error', function(it){
      return it.bind(null, t);
    }(function(t){
      return t.errored = true;
    }));
    s.on('finish', function(it){
      return it.bind(null, t);
    }(function(t){
      expect(t.errored).equals(val);
      return next();
    }));
    return s;
  };
  streamShouldError = function(next, s){
    return _sse(true, next, s);
  };
  streamShouldNotError = function(next, s){
    return _sse(false, next, s);
  };
  gulpStreamExpect = function(check){
    return Object.assign(through2.obj(function(){
      this._gse.inputs.push(arguments[0]);
      arguments[2]();
    }, function(){
      check(this._gse.inputs);
      arguments[0]();
    }), {
      _gse: {
        inputs: []
      }
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
  multidone = function(count, done){
    var o, this$ = this;
    o = {
      count: count
    };
    return function(it){
      return it.bind(null, o, done);
    }(function(o, done){
      console.log('done?', o.count);
      if (1 > --o.count) {
        return done();
      }
    });
  };
  split = function(s, p){
    s = s.pipe(gulpHydra({
      css: function(it){
        return /.*\.css$/.test(it.path);
      },
      rest: function(it){
        return !/.*\.css$/.test(it.path);
      }
    }));
    return p(s.css, s.rest);
  };
  describe('gulp', function(___){
    this.timeout(2 * 1000);
    it('output css only', function(done){
      split(testConfigStream({
        Roboto: ['400', '100i']
      }).pipe(gulpGfonts(opts({
        embed: true,
        formats: ['woff2']
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(0);
        }))).on('finish', function(){
          done();
        });
      });
    });
    it('failing options', function(done){
      return streamShouldError(done, testConfigStream({
        Roboto: ['400', '100i']
      }).pipe(gulpGfonts(opts({
        formats: 1
      }))));
    });
    it('output css and separate eot in ie8-compatible mode even in full embedded mode', function(done){
      return split(testConfigStream({
        Roboto: ['400']
      }).pipe(gulpGfonts(opts({
        embed: false,
        formats: {
          eot: {
            embed: true
          },
          ttf: {
            embed: true
          }
        }
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        }))).on('finish', function(){
          done();
        });
      });
    });
    it('throw error if google responded error', function(done){
      streamShouldError(done, merge(testConfigStream({
        Ro11boto: ['400']
      }), testConfigStream({
        Roboto: ['100']
      })).pipe(gulpGfonts(opts({}))));
    });
    return it('output css and separate files', function(done){
      return split(testConfigStream({
        Roboto: ['400']
      }).pipe(gulpGfonts(opts({
        embed: false,
        formats: {
          woff2: true,
          woff: true,
          svg: true,
          eot: true
        }
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).to.be.at.least(4);
        }))).on('finish', function(){
          done();
        });
      });
    });
  });
  describe('input', function(___){
    it('mixed input with directory', function(done){
      split(merge(gulp.src(['./', './src/test.json']), testConfigStream({
        Roboto: ['100i']
      })).pipe(gulpGfonts(opts({
        noie8: true,
        formats: {
          ttf: true
        }
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(2);
        }))).on('finish', function(){
          done();
        });
      });
    });
    it('buffer input', function(done){
      var x$;
      split((x$ = new Readable(), x$._read = function(){
        this.push('{"Roboto": ["500"]}');
        this.push(null);
      }, x$).pipe(gulpGfonts(opts({
        noie8: true,
        formats: {
          ttf: true
        }
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(1);
        }))).on('finish', function(){
          done();
        });
      });
    });
    it('empty', function(done){
      split(gulp.src(['./']).pipe(gulpGfonts(opts({
        formats: {
          ttf: true
        }
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(0);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(0);
        }))).on('finish', function(){
          done();
        });
      });
    });
    it('stream input', function(done){
      var x$;
      streamShouldError(done, (x$ = new source(), x$.write('{"Roboto": ["500"]}'), process.nextTick(bind$(x$, 'end')), x$).pipe(gulpGfonts(opts({
        noie8: true,
        formats: {
          ttf: true
        }
      }))));
    });
    it('null input', function(done){
      split(gulp.src(['./src/test.json'], {
        read: false
      }).pipe(gulpGfonts(opts({
        formats: {
          ttf: true
        }
      }))), function(){
        merge(arguments[0].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(0);
        })), arguments[1].pipe(gulpStreamExpect(function(it){
          return expect(it.length).equal(0);
        }))).on('finish', function(){
          done();
        });
      });
    });
    return it('vinyl stream input', function(done){
      var x$;
      streamShouldNotError(done, (x$ = new source(), x$.write('{"Roboto": ["500"]}'), process.nextTick(bind$(x$, 'end')), x$).pipe(vinylBuffer()).pipe(gulpGfonts(opts({
        noie8: true,
        formats: {
          ttf: true
        }
      }))));
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
    it('wrong process input', function(done){
      expect(function(){
        return new gulpGfonts.Processor(opts({
          formats: ['woff2']
        })).processInput('string' + [0, 1, 4, 6, 48].map(String.fromCharCode), function(){
          expect(arguments[0]).to.exist;
          return done();
        });
      }).to.not['throw']();
    });
    it('wrong css', function(done){
      expect(function(){
        var q;
        q = new gulpGfonts.Processor(opts({
          formats: ['woff2'],
          ___mockDownloadCss: function(){
            return arguments[1](null, ['@font-face {}\n@font-face { font-family: \'Roboto\'; src: url(some); }']);
          }
        }));
        return q.processInput('dummy', function(){
          var k, ref$, v;
          expect(Object.keys(q.registry.signatures).length).equal(1);
          for (k in ref$ = q.registry.signatures) {
            v = ref$[k];
            v.generate();
          }
          return done();
        });
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
    it('font weight', function(){
      var pfw;
      pfw = gulpGfonts.Processor.Faces.prepareFontWeight;
      expect(pfw(400)).be.a('number').and.equal(400);
      expect(pfw('200')).be.a('number').and.equal(200);
      expect(pfw('Normal')).be.a('number').and.equal(400);
      expect(pfw(160)).be.a('number').and.equal(100);
      return expect(pfw('ikhjkj')).be.a('number').and.equal(400);
    });
    it('css', function(){
      var tester;
      tester = function(){
        var p;
        p = new gulpGfonts.Processor(opts({
          formats: ['woff2', 'eot']
        }));
        return new gulpGfonts.Processor.Faces(p.options, p.formats);
      };
      expect(function(){
        var q;
        q = tester().add({
          'font-family': 'Roboto'
        }).add({
          'font-family': 'Roboto'
        });
        return expect(Object.keys(q.signatures).length).equal(1);
      }).to.not['throw']();
      expect(function(){
        return tester().add({
          'font-family': 'Roboto',
          'font-style': 'something'
        });
      }).to['throw']();
      expect(function(){
        return tester().add({
          'font-style': 'normal'
        });
      }).to['throw']();
      expect(function(){
        var x$;
        x$ = tester();
        x$.add({
          'font-family': 'Roboto',
          'src': 'url(http://some.com/font.woff2)'
        });
        x$.add({
          'font-family': 'Roboto',
          'src': 'url(http://some.com/font.woff2)'
        });
        expect(Object.keys(x$.signatures).length).equal(1);
        expect(x$.signatures[Object.keys(x$.signatures)[0]].srcs.length).equal(1);
        return x$;
      }).to.not['throw']();
      expect(function(){
        var x$;
        x$ = tester();
        x$.add({
          'font-family': 'Roboto',
          'src': 'url(http://some.com/font.ttf)'
        });
        expect(Object.keys(x$.signatures).length).equal(1);
        expect(x$.signatures[Object.keys(x$.signatures)[0]].srcs.length).equal(0);
        return x$;
      }).to.not['throw']();
      expect(function(){
        var x$;
        x$ = tester();
        x$.add({
          'font-family': 'Roboto',
          'src': "url(http://some.com/woff2-font) format('woff2')"
        });
        expect(Object.keys(x$.signatures).length).equal(1);
        expect(x$.signatures[Object.keys(x$.signatures)[0]].srcs.length).equal(1);
        return x$;
      }).to.not['throw']();
      return expect(function(){
        var x$;
        x$ = tester();
        x$.add({
          'font-family': 'Roboto',
          'src': "url(http://some.com/woff2-font)"
        });
        expect(Object.keys(x$.signatures).length).equal(1);
        expect(x$.signatures[Object.keys(x$.signatures)[0]].srcs.length).equal(0);
        return x$;
      }).to.not['throw']();
    });
    return it('download wrong font', function(done){
      var tester;
      tester = function(){
        var p;
        p = new gulpGfonts.Processor(opts({
          formats: ['woff2', 'eot']
        }));
        return new gulpGfonts.Processor.Faces(p.options, p.formats);
      };
      return expect(function(){
        var x$, a;
        x$ = tester();
        x$.add({
          'font-family': 'Roboto',
          'src': "url(qweqwe://.ly/font.woff2)"
        });
        expect(Object.keys(x$.signatures).length).equal(1);
        a = x$.signatures[Object.keys(x$.signatures)[0]].srcs;
        expect(a.length).equal(1);
        a[0].downloadFont(done);
        return x$;
      }).to.not['throw']();
    });
  });
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
