(function(){
  var _, async, origRequest, css, path, crypto, gulpUtil, htmlToText, vinyl, isGulp, request, extDefs, File, through2, isBinary, weightsSymbolicMapping, createLocal, defaultLocals, Faces, Processor;
  _ = require('lodash');
  async = require('async');
  origRequest = require('request');
  css = require('css');
  path = require('path');
  crypto = require('crypto');
  gulpUtil = require('gulp-util');
  htmlToText = require('html-to-text');
  vinyl = require('vinyl');
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
  request = function(url, done){
    var this$ = this;
    return origRequest(url, function(it){
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
      postfix: '?#iefix',
      hasGhost: true,
      ext: 'eot'
    },
    woff: {
      mime: 'woff',
      ua: 'Mozilla/4.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36',
      priority: 4,
      ext: 'woff'
    },
    woff2: {
      mime: 'woff2',
      ua: 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
      priority: 3,
      ext: 'woff2'
    },
    svg: {
      mime: 'svg',
      ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16',
      ext: 'svg'
    },
    ttf: {
      mime: 'truetype',
      ua: null,
      priority: 10,
      ext: 'ttf'
    }
  };
  extDefs.opentype = extDefs.eot;
  File = require('vinyl');
  through2 = require('through2');
  isBinary = bind$(/[\x00-\x09\x0E-\x1F]/, 'test');
  weightsSymbolicMapping = {
    normal: 400,
    bold: 700
  };
  createLocal = function(it){
    return {
      priority: 0,
      name: it,
      generate: function(){
        return "local('" + this.name + "')";
      }
    };
  };
  defaultLocals = [createLocal('')];
  Faces = (function(){
    Faces.displayName = 'Faces';
    var prototype = Faces.prototype, constructor = Faces;
    Faces.prepareFontWeight = function(it){
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
    Faces.prepareFontFamily = function(f){
      var ref$, ref1$;
      return (ref$ = (ref1$ = f.match(/^\'(.+)\'$/)) != null ? ref1$[1] : void 8) != null ? ref$ : f;
    };
    function Faces(options, formats){
      this.options = options;
      this.formats = formats;
      this.signatures = {};
      this.locals = {};
      this.fontFiles = {};
    }
    Faces.prototype.add = function(it){
      this.signature(it).add(it);
      return this;
    };
    Faces.prototype.signature = function(it){
      var signatures, locals, fontFiles, formats, options, r, ref$, signatureBase, signature, ref1$;
      signatures = this.signatures, locals = this.locals, fontFiles = this.fontFiles, formats = this.formats, options = this.options;
      r = {
        family: it['font-family'],
        weight: constructor.prepareFontWeight(it['font-weight']),
        style: (ref$ = it['font-style']) != null ? ref$ : 'normal',
        range: it['unicode-range']
      };
      if (!r.family) {
        throw 'font-family not found in @font-face declaration, skipping face';
      }
      r.family = constructor.prepareFontFamily(r.family);
      if ((ref$ = r.style) !== 'normal' && ref$ !== 'italic') {
        throw "Unknown font-style: " + r.style + "; skipping face";
      }
      signatureBase = (r.family.substr(0, 8) + "-" + r.weight + (r.style === 'italic' ? 'i' : '')).replace(/[^_a-zA-Z0-9-]/g, '-');
      signature = [signatureBase, (ref$ = (ref1$ = r.range) != null ? ref1$.replace(/[Uu\s,]/g, '') : void 8) != null ? ref$ : ''].join('');
      return (ref$ = signatures[signature]) != null
        ? ref$
        : signatures[signature] = _.assign(r, {
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
            var ref$, this$ = this;
            if ((ref$ = it.src) != null) {
              ref$.split(',').forEach(function(it){
                var ref$, full, url, fmt, format, SrcProto, mk, ghost, ref1$, name, lcs;
                switch (false) {
                case !((ref$ = it.match(/\s*url\(([^\)]+)\)\s*(?:format\(\'(.+)\'\))?\s*/)) != null && (full = ref$[0], url = ref$[1], fmt = ref$[2], ref$)):
                  format = (ref$ = formats[fmt]) != null
                    ? ref$
                    : formats[(ref$ = url.match(/^[^#]+\.([_a-zA-Z0-9-]+)\s*$/)) != null ? ref$[1] : void 8];
                  if (!format) {
                    return;
                  }
                  if (_.find(this$.srcs, function(it){
                    return it.url === url && it.format === format;
                  })) {
                    return;
                  }
                  SrcProto = {
                    filename: function(){
                      var ref$;
                      return (ref$ = this._filename) != null
                        ? ref$
                        : this._filename = this.face.filename() + "." + this.format.ext;
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
                      format: format
                    };
                  };
                  if (!options.noie8 && format.hasGhost) {
                    this$.ie8srcs.push(ghost = _.assign(Object.create(SrcProto), mk(), {
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
                  this$.srcs.push(_.assign(Object.create(SrcProto), mk(), {
                    priority: format.priority,
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
                    },
                    downloadFont: function(next){
                      this.downloaded = true;
                      prebounded([this, next], request, {
                        url: this.url,
                        encoding: null,
                        headers: {
                          'User-Agent': this.format.ua
                        }
                      }, function(next, e, r, b){
                        this.gotFontContent(e, b, next);
                      });
                    }
                  }));
                  break;
                case !((ref1$ = it.match(/\s*local\(\'(.+)\'\)\s*/)) != null && (full = ref1$[0], name = ref1$[1], ref1$)):
                  lcs = locals[this$.signatureBase];
                  if (lcs) {
                    if (_.find(lcs, function(it){
                      return it.name === name;
                    })) {
                      return;
                    }
                    lcs.push(createLocal(name));
                  } else {
                    locals[this$.signatureBase] = [createLocal(name)];
                  }
                }
              });
            }
          },
          generate: function(){
            var this$ = this;
            return function(it){
              return "@font-face {\n" + it + "\n}";
            }(
            _.map(_.assign({
              style: this.style,
              weight: this.weight
            }, {
              family: "'" + this.family + "'"
            }), function(){
              return "font-" + arguments[1] + ": " + arguments[0] + ";";
            }).concat(this.range != null
              ? ["unicode-range: '" + this.range + "';"]
              : []).concat(this.ie8srcs.map(function(it){
              return it.generate();
            }).concat([_((locals[this.signatureBase] || defaultLocals).concat(this.srcs)).filter(function(it){
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
    return Faces;
  }());
  Processor = (function(){
    Processor.displayName = 'Processor';
    var prototype = Processor.prototype, constructor = Processor;
    function Processor(inOptions){
      var options, that, concreteFormat, optionsValidators, this$ = this;
      options = this.options = _.mergeWith(_.assign({}, inOptions), {
        inCssBase: './fonts',
        fontsBase: './fonts',
        cssBase: './fonts',
        cssName: 'fonts.css',
        limitDownloads: 4,
        embed: false,
        noie8: false,
        formats: null
      }, function(){
        var ref$;
        return (ref$ = arguments[0]) != null
          ? ref$
          : arguments[1];
      });
      if (that = options.___mockDownloadCss) {
        this.downloadCss = that;
      }
      this.formats = {};
      concreteFormat = function(){
        return this$.formats[arguments[0]] = _.assign({}, extDefs[arguments[0]], arguments[1]);
      };
      optionsValidators = {
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
      this.registry = new Faces(this.options, this.formats);
    }
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
    Processor.prototype.downloadCss = function(query, next){
      return async.parallelLimit(_.map(this.formats, function(arg$){
        var ua, this$ = this;
        ua = arg$.ua;
        return function(it){
          return it.bind(null, ua);
        }(function(ua, next){
          return request({
            url: "http://fonts.googleapis.com/css?" + query,
            headers: {
              'User-Agent': ua != null ? ua : ''
            }
          }, function(e, r, b){
            next(e, b);
          });
        });
      }), this.options.limitDownloads, next);
    };
    Processor.prototype.processInput = function(input, next){
      var options, formats, registry, collectedCss, fontFiles, e, this$ = this;
      options = this.options, formats = this.formats, registry = this.registry, collectedCss = this.collectedCss, fontFiles = this.fontFiles;
      try {
        input = this.prepareInput(input);
      } catch (e$) {
        e = e$;
        return next(e);
      }
      this.downloadCss(input, function(e, raws){
        if (e != null) {
          return next(e);
        }
        raws.map(function(it){
          var data, this$ = this;
          data = css.parse(it);
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
        }).forEach(function(it){
          it.forEach(function(it){
            var e;
            try {
              registry.add(it);
            } catch (e$) {
              e = e$;
              console.warn(e);
            }
          });
        });
        async.parallelLimit(_.reduce(this$.registry.signatures, (function(it){
          return it.concat(arguments[1].srcs);
        }), []).filter(function(it){
          return !it.downloaded;
        }).map(function(it){
          return bind$(it, 'downloadFont');
        }), options.limitDownloads, function(e){
          next(e);
        });
      });
    };
    Processor.prototype.write = function(write){
      var this$ = this;
      _.forEach(this.registry.fontFiles, function(content, name){
        return write(name, content);
      });
      return write(path.join(this.options.cssBase, this.options.cssName), new Buffer(_.map(this.registry.signatures, function(it){
        return it.generate();
      }).join('\n')));
    };
    return Processor;
  }());
  Processor.Faces = Faces;
  module.exports = function(options){
    return through2.obj(function(input, enc, next){
      var ctx, ref$, e, this$ = this;
      if (this.__gfont_error) {
        return next();
      }
      try {
        switch (false) {
        case !(gulpUtil.isBuffer(input) || _.isString(input)):
          input;
          break;
        case !input.isStream():
          throw 'streams not supported';
        case !(input.isDirectory() || input.isNull()):
          return next();
        default:
          input = input.contents;
        }
        ctx = (ref$ = this.__gfont_ctx) != null
          ? ref$
          : this.__gfont_ctx = new Processor(options);
      } catch (e$) {
        e = e$;
        this.__gfont_error = e;
        return next();
      }
      ctx.processInput(String(input), function(e, r){
        if (e != null) {
          this$.__gfont_ctx = null;
          this$.__gfont_error = e;
        }
        next();
      });
    }, function(next){
      var that, ref$, this$ = this;
      if (that = this.__gfont_error) {
        this.emit('error', fatal(that));
      } else {
        if ((ref$ = this.__gfont_ctx) != null) {
          ref$.write(function(path, contents){
            this$.push(new File({
              path: path,
              contents: contents
            }));
          });
        }
      }
      next();
    });
  };
  _.assign(module.exports, {
    Processor: Processor
  });
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
