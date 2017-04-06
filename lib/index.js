(function(){
  var _, async, origRequest, css, path, crypto, gulpUtil, htmlToText, isGulp, request, extDefs, File, through2, isBinary, weightsSymbolicMapping, Processor;
  _ = require('lodash');
  async = require('async');
  origRequest = require('request');
  css = require('css');
  path = require('path');
  crypto = require('crypto');
  gulpUtil = require('gulp-util');
  htmlToText = require('html-to-text');
  isGulp = !!module.parent;
  function hash(it){
    return crypto.createHash('md5').update(it).digest('hex');
  }
  function html2text(it){
    return htmlToText.fromString(it, {
      ignoreHref: true,
      ignoreImage: true
    }).replace(/\n{2,}/mg, '\n');
  }
  function fatal(it){
    return new gulpUtil.PluginError('gulp-gfonts', it, {
      showStack: true,
      showProperties: true
    });
  }
  function prebounded(bindings, fn){
    var i$, args, res$, j$, t;
    res$ = [];
    for (j$ = 2 < (i$ = arguments.length - 1) ? 2 : (i$ = 2); j$ < i$; ++j$) {
      res$.push(arguments[j$]);
    }
    args = res$; t = arguments[i$];
    return fn.apply(null, args.concat([Function.prototype.bind.apply(t, bindings)]));
  }
  request = function(url, params, done){
    var this$ = this;
    return origRequest(url, params, function(it){
      return it.bind(null, done);
    }(function(done, e, r, b){
      var ref$;
      ref$ = (function(){
        var ref$;
        switch (false) {
        case e == null:
          return [null, e];
        case !(200 <= (ref$ = r.statusCode) && ref$ < 400):
          return [r.body, e];
        default:
          return [null, html2text(b)];
        }
      }()), b = ref$[0], e = ref$[1];
      done(e, r, b);
    }));
  };
  extDefs = {
    eot: {
      mime: 'embedded-opentype',
      ua: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)',
      priority: 1,
      postfix: '?#iefix'
    },
    woff: {
      mime: 'woff',
      ua: 'Mozilla/4.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36',
      priority: 4
    },
    woff2: {
      mime: 'woff2',
      ua: 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
      priority: 3
    },
    svg: {
      mime: 'svg',
      ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16'
    },
    ttf: {
      mime: 'truetype',
      ua: null,
      priority: 10
    }
  };
  File = require('vinyl');
  through2 = require('through2');
  isBinary = bind$(/[\x00-\x09\x0E-\x1F]/, 'test');
  weightsSymbolicMapping = {
    normal: 400,
    bold: 700
  };
  Processor = (function(){
    Processor.displayName = 'Processor';
    var prototype = Processor.prototype, constructor = Processor;
    function Processor(inOptions){
      var options, concreteFormat, optionsValidators, this$ = this;
      this.fontFiles = {};
      this.collectedCss = {};
      options = this.options = _.mergeWith(_.assign({}, inOptions), {
        inCssBase: './fonts',
        fontsBase: './fonts',
        cssBase: './fonts',
        cssName: 'fonts.css',
        limitDownloads: 4,
        embed: false,
        noie8: false,
        fontsStream: null,
        formats: null
      }, function(){
        var ref$;
        return (ref$ = arguments[0]) != null
          ? ref$
          : arguments[1];
      });
      this.formats = {};
      concreteFormat = function(){
        return this$.formats[arguments[0]] = _.assign({}, extDefs[arguments[0]], arguments[1]);
      };
      optionsValidators = {
        fontsStream: [
          function(it){
            return it == null || _.isFunction(it);
          }, 'function'
        ],
        limitDownloads: [
          function(it){
            return 1 <= it && it <= 20;
          }, 'number (1 to 20)'
        ],
        formats: [
          function(it){
            var e;
            it == null && (it = Object.keys(extDefs));
            try {
              switch (false) {
              case !_.isArray(it):
                _.forEach(it, function(it){
                  if (!(it in extDefs)) {
                    throw '';
                  }
                  concreteFormat(it, {
                    embed: !!options.embed
                  });
                });
                break;
              case !_.isObject(it):
                _.forEach(it, function(){
                  var ref$;
                  if (!(arguments[1] in extDefs)) {
                    throw '';
                  }
                  switch (false) {
                  case !_.isObject(arguments[0]):
                    concreteFormat(arguments[1], {
                      embed: !!((ref$ = arguments[0].embed) != null
                        ? ref$
                        : options.embed)
                    });
                    break;
                  default:
                    if (arguments[0]) {
                      concreteFormat(arguments[1], {
                        embed: !!options.embed
                      });
                    }
                  }
                });
                break;
              default:
                throw '';
              }
            } catch (e$) {
              e = e$;
              return false;
            }
            return true;
          }, 'array of strings of map with type:[bool|object]'
        ]
      };
      _.forEach(options, function(){
        var v;
        v = optionsValidators[arguments[1]];
        if (v != null && !v[0](arguments[0])) {
          throw "Wrong option value for key " + arguments[1] + ": " + arguments[0] + " (expected " + v[1] + ")";
        }
      });
    }
    Processor.prepareFontWeight = function(it){
      var w;
      w = +it;
      if (_.isNaN(w)) {
        w = weightsSymbolicMapping[(it + "").toLowerCase()];
      }
      if (w) {
        return 100 * Math.floor(w / 100);
      } else {
        return 400;
      }
    };
    Processor.prepareFontFamily = function(f){
      var ref$, ref1$;
      return (ref$ = (ref1$ = f.match(/^\'(.+)\'$/)) != null ? ref1$[1] : void 8) != null ? ref$ : f;
    };
    Processor.prototype.prepareInput = function(input){
      var q, e;
      if (isBinary(input)) {
        throw "source must be buffer with string, got " + input;
      }
      try {
        q = _.map(JSON.parse(input), function(){
          return [
            arguments[1].replace(/\s/g, '+'), (function(args$){
              switch (false) {
              case !_.isString(args$[0]):
                return args$[0];
              case !_.isArray(args$[0]):
                return args$[0].join(',');
              default:
                throw 'wrong font garnitures definition, can be string like "100,500i" or array of that items';
              }
            }(arguments))
          ].join(':');
        }).join('|');
        return "family=" + q;
      } catch (e$) {
        e = e$;
        if (e.name !== 'SyntaxError') {
          throw e;
        }
        return input;
      }
    };
    Processor.prototype.processInput = function(input, next){
      var options, formats, fontFiles, collectedCss, e, query, requestCss, signatures, locals, signature, this$ = this;
      options = this.options, formats = this.formats, fontFiles = this.fontFiles, collectedCss = this.collectedCss;
      try {
        input = this.prepareInput(input);
      } catch (e$) {
        e = e$;
        return next(e);
      }
      query = input;
      requestCss = request;
      signatures = {};
      locals = {};
      signature = function(it){
        var r, ref$, signatureBase, signature, ref1$;
        r = {
          family: constructor.prepareFontFamily(it['font-family']),
          weight: constructor.prepareFontWeight(it['font-weight']),
          style: (ref$ = it['font-style']) != null ? ref$ : 'normal',
          range: it['unicode-range']
        };
        if ((ref$ = r.style) !== 'normal' && ref$ !== 'italic') {
          return console.log("Unknown font-style: " + r.style + "; skipping face"), null;
        }
        signatureBase = (r.family.substr(0, 8) + "-" + r.weight + (r.style === 'italic' ? 'i' : '')).replace(/[^_a-zA-Z0-9-]/g, '-');
        signature = [signatureBase, (ref$ = (ref1$ = r.range) != null ? ref1$.replace(/[Uu\s,]/g, '') : void 8) != null ? ref$ : ''].join('');
        return (ref$ = signatures[signature]) != null
          ? ref$
          : signatures[signature] = import$(r, {
            filename: function(){
              var ref$;
              return (ref$ = this._filename) != null
                ? ref$
                : this._filename = [this.signatureBase, hash(this.signature)].join('-').toLowerCase();
            },
            srcs: [],
            ie8srcs: [],
            signature: signature,
            signatureBase: signatureBase,
            add: function(it){
              var this$ = this;
              it.src.split(',').map(function(it){
                var ref$;
                return (ref$ = it.match(/^\s*(.*)\s*$/)) != null ? ref$[1] : void 8;
              }).forEach(function(it){
                var ref$, full, url, format, ext, SrcProto, mk, ghost, ref1$, name, x$, key$;
                switch (false) {
                case !_.find(this$.srcs, it):
                  return;
                case !((ref$ = it.match(/\s*url\(([^\)]+)\)\s*(?:format\(\'(.+)\'\))?\s*/)) != null && (full = ref$[0], url = ref$[1], format = ref$[2], ref$)):
                  ext = (ref$ = url.match(/^[^#]+\.([_a-zA-Z0-9-]+)$/)) != null ? ref$[1] : void 8;
                  if ((format = formats[ext]) == null) {
                    return;
                  }
                  SrcProto = {
                    filename: function(){
                      var ref$;
                      return (ref$ = this._filename) != null
                        ? ref$
                        : this._filename = this.face.filename() + "." + this.ext;
                    },
                    realUrl: function(){
                      var ref$;
                      return path.join(options.inCssBase, this.filename()) + "" + ((ref$ = this.format.postfix) != null ? ref$ : '');
                    },
                    embedFont: function(font, next){
                      this.url = "data:font/" + this.format.mime + ";charset=utf-8;base64," + font.toString('base64');
                      next();
                    },
                    saveFont: function(font, next){
                      this.url = this.realUrl();
                      fontFiles[path.join(options.fontsBase, this.filename())] = font;
                      next();
                    }
                  };
                  mk = function(){
                    return {
                      face: this$,
                      priority: 0,
                      url: url,
                      ext: ext,
                      format: format
                    };
                  };
                  if (!options.noie8 && ext === 'eot') {
                    this$.ie8srcs.push(ghost = import$(import$(Object.create(SrcProto), mk()), {
                      priority: 0,
                      realUrl: function(){
                        return path.join(options.inCssBase, this.filename()) + "";
                      },
                      generate: function(){
                        return "url('" + this.url + "')";
                      },
                      gotFontContent: function(){
                        return this.saveFont.apply(this, arguments);
                      }
                    }));
                  }
                  this$.srcs.push(import$(import$(Object.create(SrcProto), mk()), {
                    priority: format.priority || 10,
                    ghost: ghost,
                    generate: function(){
                      return "url('" + this.url + "') format('" + this.format.mime + "')";
                    },
                    gotFontContent: function(e, f, next){
                      var ref$, ref1$, this$ = this;
                      switch (false) {
                      case e == null:
                        this.invalid = true;
                        console.log("cannot download font " + this.filename() + ": " + this.url + " with " + e + "; skipping");
                        next(null, e);
                        break;
                      case !this.format.embed:
                        this.embedFont(f, (ref$ = (ref1$ = this.ghost) != null ? ref1$.gotFontContent.bind(this.ghost, f, next) : void 8) != null ? ref$ : next);
                        break;
                      default:
                        this.saveFont(f, function(){
                          var ref$;
                          if ((ref$ = this$.ghost) != null) {
                            ref$.url = this$.ghost.realUrl();
                          }
                          next();
                        });
                      }
                    }
                  }));
                  break;
                case !((ref1$ = it.match(/\s*local\(\'(.+)\'\)\s*/)) != null && (full = ref1$[0], name = ref1$[1], ref1$)):
                  x$ = locals[key$ = this$.signatureBase] || (locals[key$] = []);
                  if (!_.find(x$, function(it){
                    return it.name === name;
                  })) {
                    x$.push({
                      priority: 0,
                      name: name,
                      generate: function(){
                        return "local('" + this.name + "')";
                      }
                    });
                  }
                }
              });
            },
            generate: function(){
              var ref$, key$, this$ = this;
              return function(it){
                return "@font-face {\n" + it + "\n}";
              }(
              _.map((ref$ = {
                style: this.style,
                weight: this.weight
              }, ref$.family = "'" + this.family + "'", ref$), function(){
                return "font-" + arguments[1] + ": " + arguments[0] + ";";
              }).concat(this.range != null
                ? ["unicode-range: '" + this.range + "';"]
                : []).concat(this.ie8srcs.map(function(it){
                return it.generate();
              }).concat([_((locals[key$ = this.signatureBase] || (locals[key$] = [])).concat(this.srcs)).filter(function(it){
                return !it.invalid;
              }).sort(function(it){
                return it.priority - arguments[1].priority;
              }).map(function(it){
                return it.generate();
              }).join(',\n    ')]).map(function(it){
                return "src: " + it + ";";
              })).map(function(it){
                return "  " + it;
              }).join('\n'));
            }
          });
      };
      async.parallelLimit(_.map(formats, function(arg$){
        var ua, this$ = this;
        ua = arg$.ua;
        return function(it){
          return it.bind(null, ua);
        }(function(ua, next){
          return requestCss("http://fonts.googleapis.com/css?" + query, {
            headers: {
              'User-Agent': ua != null ? ua : ''
            }
          }, function(e, r, b){
            next(e, b);
          });
        });
      }), options.limitDownloads, function(e, raws){
        if (e != null) {
          return next(e);
        }
        raws.map(function(rawcss){
          var data, this$ = this;
          data = css.parse(rawcss);
          return data[data.type].rules.filter(function(it){
            return it.type === 'font-face';
          }).map(function(it){
            var this$ = this;
            return _.fromPairs(it.declarations.filter(function(it){
              return it.type === 'declaration';
            }).map(function(it){
              return [it.property, it.value];
            }));
          });
        }).reduce((function(it){
          return it.concat(arguments[1]);
        }), []).forEach(function(it){
          var ref$;
          if ((ref$ = signature(it)) != null) {
            ref$.add(it);
          }
        });
        async.parallelLimit(_.reduce(signatures, (function(it){
          return it.concat(arguments[1].srcs);
        }), []).map(function(src){
          var this$ = this;
          return function(it){
            return it.bind(null, src);
          }(function(src, next){
            return prebounded([null, src], request, {
              url: src.url,
              encoding: null
            }, function(src, e, r, b){
              src.gotFontContent(e, b, next);
            });
          });
        }), options.limitDownloads, function(e){
          var this$ = this;
          if (e != null) {
            return next(e);
          }
          collectedCss[path.join(options.cssBase, options.cssName)] = new Buffer(_.map(signatures, function(it){
            return it.generate();
          }).join('\n'));
          next();
        });
      });
    };
    Processor.prototype.write = function(mainStream, write, next){
      var fontsStream, this$ = this;
      fontsStream = this.options.fontsStream != null ? through2.obj() : mainStream;
      return async.eachOfSeries(this.collectedCss, function(content, name, next){
        return write(mainStream, name, content, next);
      }, function(){
        async.eachOfSeries(this$.fontFiles, function(content, name, next){
          return write(fontsStream, name, content, next);
        }, function(){
          (this$.options.fontsStream == null
            ? function(it){
              return it({}, {});
            }
            : function(next){
              var restricted, called, s;
              restricted = {
                v: false
              };
              called = {
                v: false
              };
              process.nextTick(bind$(fontsStream, 'end'));
              s = this$.options.fontsStream(fontsStream, next.bind(null, restricted, called));
              if (s != null) {
                restricted.v = true;
                return s.on('finish', next.bind(null, {}, called));
              }
            })(function(restricted, called){
            if (restricted.v) {
              called.v = true;
              return next('Calling callback after stream returned');
            }
            if (called.v) {
              return;
            }
            called.v = true;
            next();
          });
        });
      });
    };
    return Processor;
  }());
  module.exports = function(options){
    return through2.obj(function(input, enc, next){
      var ctx, ref$, e, this$ = this;
      try {
        ctx = (ref$ = this.__gfont_ctx) != null
          ? ref$
          : this.__gfont_ctx = new Processor(options);
      } catch (e$) {
        e = e$;
        this.emit('error', fatal(e));
      }
      switch (false) {
      case !gulpUtil.isBuffer(input.contents):
        input = String(input.contents);
        break;
      case !gulpUtil.isStream(input.contents):
        throw "streams not supported";
      case !(!input.isDirectory() && !input.isNull()):
        throw "unsupported input: " + input;
      default:
        input = null;
      }
      ctx.processInput(input, function(e, r){
        if (e != null) {
          this$.emit('error', fatal(e));
        } else {
          next();
        }
      });
    }, function(next){
      var this$ = this;
      this.__gfont_ctx.write(this, function(stream, path, contents, next){
        stream.push(new File({
          path: path,
          contents: contents
        }));
        next(null, null);
      }, function(e, r){
        if (e != null) {
          this$.emit('error', fatal(e));
        } else {
          this$.emit('finish');
          next();
        }
      });
    });
  };
  module.exports.Processor = Processor;
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
