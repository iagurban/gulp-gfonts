(function(){
  var _, async, request, css, path, crypto, gulpUtil, htmlToText, isGulp, hash, html2text, extDefs, fatal, main, File, through2;
  _ = require('lodash');
  async = require('async');
  request = require('request');
  css = require('css');
  path = require('path');
  crypto = require('crypto');
  gulpUtil = require('gulp-util');
  htmlToText = require('html-to-text');
  isGulp = !!module.parent;
  hash = function(it){
    return crypto.createHash('md5').update(it).digest('hex');
  };
  html2text = function(it){
    return htmlToText.fromString(it, {
      ignoreHref: true,
      ignoreImage: true
    }).replace(/\n{2,}/mg, '\n');
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
  fatal = function(it){
    return new gulpUtil.PluginError('gulp-gfonts', it, {
      showStack: true,
      showProperties: true
    });
  };
  function prebounded(bindings, fn){
    var i$, args, res$, j$, t;
    res$ = [];
    for (j$ = 2 < (i$ = arguments.length - 1) ? 2 : (i$ = 2); j$ < i$; ++j$) {
      res$.push(arguments[j$]);
    }
    args = res$; t = arguments[i$];
    return fn.apply(null, args.concat([Function.prototype.bind.apply(t, bindings)]));
  }
  main = function(options, write, next){
    var fontsStream, mainStream, formats, optionsValidators, e, prepareFontWeight, prepareFontFamily, signatures, locals, signature, this$ = this;
    options = _.mergeWith(_.assign({}, options), {
      query: null,
      inCssBase: './fonts',
      fontsBase: './fonts',
      cssBase: './fonts',
      cssName: 'fonts.css',
      limitDownloads: 4,
      embed: false,
      fork: false,
      noie8: false,
      fontsStream: null
    }, function(){
      var ref$;
      return (ref$ = arguments[0]) != null
        ? ref$
        : arguments[1];
    });
    fontsStream = mainStream = this;
    if (options.fontsStream != null) {
      fontsStream = through2.obj();
    }
    formats = {};
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
                formats[it] = _.assign({}, extDefs[it], {
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
                  formats[arguments[1]] = _.assign({}, extDefs[arguments[1]], {
                    embed: (ref$ = arguments[0].embed) != null
                      ? ref$
                      : !!options.embed
                  });
                  break;
                default:
                  if (arguments[0]) {
                    formats[arguments[1]] = _.assign({}, extDefs[arguments[1]], {
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
    try {
      _.forEach(options, function(){
        var v;
        v = optionsValidators[arguments[1]];
        if (v != null && !v[0](arguments[0])) {
          throw "Wrong option value for key " + arguments[1] + ": " + arguments[0] + " (expected " + v[1] + ")";
        }
      });
    } catch (e$) {
      e = e$;
      return next(e);
    }
    prepareFontWeight = function(w){
      var ref$;
      switch (false) {
      case w != null:
        return 400;
      case !_.isString(w):
        if (w.match('^([0-9]+)$') != null) {
          return parseInt(w);
        } else {
          return (ref$ = weightsSymbolicMapping[w]) != null ? ref$ : 400;
        }
        break;
      default:
        return 400;
      }
    };
    prepareFontFamily = function(f){
      var ref$, ref1$;
      return (ref$ = (ref1$ = f.match(/^\'(.+)\'$/)) != null ? ref1$[1] : void 8) != null ? ref$ : f;
    };
    signatures = {};
    locals = {};
    signature = function(it){
      var r, ref$, signatureBase, signature, ref1$;
      r = {
        family: prepareFontFamily(it['font-family']),
        weight: prepareFontWeight(it['font-weight']),
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
                    write(fontsStream, path.join(options.fontsBase, this.filename()), font, next);
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
                      this.saveFont.apply(this, arguments);
                    }
                  }));
                }
                this$.srcs.push(import$(import$(Object.create(SrcProto), mk()), {
                  priority: (ref1$ = format.priority) != null ? ref1$ : 10,
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
                if (_.find(x$, function(it){
                  return it.name === name;
                })) {
                  return;
                }
                x$.push({
                  priority: 0,
                  name: name,
                  generate: function(){
                    return "local('" + this.name + "')";
                  }
                });
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
        return request("http://fonts.googleapis.com/css?" + options.query, {
          headers: {
            'User-Agent': ua != null ? ua : ''
          }
        }, function(e, r, b){
          var ref$;
          ref$ = (function(){
            var ref$;
            switch (false) {
            case e == null:
              return [null, e];
            case !(200 <= (ref$ = r.statusCode) && ref$ < 400):
              return [r != null ? r.body : void 8, e];
            default:
              return [null, html2text(b)];
            }
          }()), b = ref$[0], e = ref$[1];
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
            var ref$;
            ref$ = (function(){
              var ref$;
              switch (false) {
              case e == null:
                return [null, e];
              case !(200 <= (ref$ = r.statusCode) && ref$ < 400):
                return [r != null ? r.body : void 8, e];
              default:
                return [null, html2text(b)];
              }
            }()), b = ref$[0], e = ref$[1];
            src.gotFontContent(e, b, next);
          });
        });
      }), options.limitDownloads, function(e){
        var this$ = this;
        if (e != null) {
          return next(e);
        }
        (options.fontsStream != null
          ? function(next){
            var mode, s;
            mode = {
              restricted: false
            };
            process.nextTick(bind$(fontsStream, 'end'));
            s = options.fontsStream(fontsStream, next.bind(null, mode));
            if (s != null) {
              mode.restricted = true;
              return s.on('end', next.bind(null, null));
            }
          }
          : function(it){
            return it();
          })(function(arg$){
          var restricted;
          if (arg$ != null) {
            restricted = arg$.restricted;
          }
          if (restricted) {
            return next('Calling callback after stream returned');
          }
          write(mainStream, path.join(options.cssBase, options.cssName), new Buffer(_.map(signatures, function(it){
            return it.generate();
          }).join('\n')), next);
        });
      });
    });
  };
  File = require('vinyl');
  through2 = require('through2');
  module.exports = function(options){
    return through2.obj(function(input, enc, next){
      var this$ = this;
      main.call(this, options, function(stream, path, contents, next){
        stream.push(new File({
          path: path,
          contents: contents
        }));
        next(null, null);
      }, function(e, r){
        if (e != null) {
          this$.emit('error', e = fatal(e));
        } else {
          next(null, r);
        }
      });
    });
  };
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
