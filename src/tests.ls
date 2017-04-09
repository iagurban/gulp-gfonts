require! {
  './index': gulp-gfonts

  gulp
  'gulp-concat'
  'merge2': merge
  'gulp-stylus'
  'gulp-debug'
  'gulp-hydra'
  'through2'

  'vinyl-buffer'

  chai: {expect, assert}

  'vinyl-source-stream': source

  'stream': {Readable}:Stream
}

stream-assert = require 'stream-assert'

opts = -> Object.assign do
  limit-downloads: 2
  it ? {}

_sse = (val, next, s) ->
  t = errored: false

  s.on 'error', (.bind null, t) (t) ->
    t.errored = true
  s.on 'finish', (.bind null, t) (t) ->
    expect t.errored .equals val
    next!
  s


stream-should-error = (next, s) -> _sse true, next, s
stream-should-not-error = (next, s) -> _sse false, next, s

gulp-stream-expect = (check) ->
  Object.assign do
    through2.obj do
      !->
        @_gse.inputs.push &0
        &2!
      !->
        check @_gse.inputs
        &0!
    _gse: inputs: []

expect-files-count = (cmp) ->
  Object.assign do
    through2.obj do
      (f, e, n) !-> ++@__o.v; n!
      (n) !->
        @emit 'assertion', @__o.v unless @__o.cmp @__o.v
        n!
    __o:
      v: 0
      cmp: cmp

stream-with-content = (name, content) ->
  with source name
    ..write content
    process.nextTick ..~end
    return ..pipe vinyl-buffer!

test-config-stream = ->
  stream-with-content 'test-gfontconf.json', JSON.stringify it

multidone = (count, done) ->
  o = {count}
  (.bind null, o, done) (o, done) ->
    console.log \done?, o.count
    if 1 > --o.count
      done!

split = (s, p) ->
  s .= pipe gulp-hydra do
    css: -> /.*\.css$/.test it.path
    rest: -> not /.*\.css$/.test it.path

  p s.css, s.rest

describe 'gulp', (___) ->
  @timeout 2 * 1000

  it 'output css only', (done) !->
    split do
      do
        test-config-stream Roboto: <[400 100i]>
        .pipe do
          gulp-gfonts opts do
            embed: true
            formats: <[woff2]>
      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 1
          &1.pipe gulp-stream-expect -> expect it.length .equal 0
        .on 'finish', !-> done!

  it 'failing options', (done) ->
    stream-should-error done,
      test-config-stream Roboto: <[400 100i]>
      .pipe gulp-gfonts opts formats: 1

  it 'output css and separate eot in ie8-compatible mode even in full embedded mode', (done) ->
    split do
      test-config-stream Roboto: <[400]> .pipe do
        gulp-gfonts opts do
          embed: false
          formats:
            eot: {embed: true}
            ttf: {embed: true}
      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 1
          &1.pipe gulp-stream-expect -> expect it.length .equal 1
        .on 'finish', !-> done!

  it 'throw error if google responded error', (done) !->
    stream-should-error done,
      merge do
        test-config-stream Ro11boto: <[400]>
        test-config-stream Roboto: <[100]>
      .pipe do
        gulp-gfonts opts {}

  it 'output css and separate files', (done) ->
    split do
      test-config-stream Roboto: <[400]> .pipe do
        gulp-gfonts opts do
          embed: false
          formats:
            woff2: true
            woff: true
            svg: true
            eot: true

      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 1
          &1.pipe gulp-stream-expect -> expect it.length .to.be.at.least 4
        .on 'finish', !-> done!

describe 'input', (___) ->
  it 'mixed input with directory', (done) !->
    split do
      merge do
        gulp.src ['./', './src/test.json']
        test-config-stream Roboto: <[100i]>
      .pipe gulp-gfonts opts do
        noie8: true
        formats: ttf: true
      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 1
          &1.pipe gulp-stream-expect -> expect it.length .equal 2
        .on 'finish', !-> done!

  it 'buffer input', (done) !->
    split do
      with new Readable!
        .._read = !->
          @push '{"Roboto": ["500"]}'
          @push null
      .pipe gulp-gfonts opts do
        noie8: true
        formats: ttf: true
      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 1
          &1.pipe gulp-stream-expect -> expect it.length .equal 1
        .on 'finish', !-> done!

  it 'empty', (done) !->
    split do
      gulp.src ['./']
      .pipe gulp-gfonts opts formats: ttf: true
      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 0
          &1.pipe gulp-stream-expect -> expect it.length .equal 0
        .on 'finish', !-> done!

  it 'stream input', (done) !->
    stream-should-error done,
      with new source!
        ..write '{"Roboto": ["500"]}'
        process.nextTick ..~end
      .pipe gulp-gfonts opts do
        noie8: true
        formats: ttf: true

  it 'null input', (done) !->
    split do
      gulp.src ['./src/test.json'], read: false
      .pipe gulp-gfonts opts formats: ttf: true
      !->
        merge do
          &0.pipe gulp-stream-expect -> expect it.length .equal 0
          &1.pipe gulp-stream-expect -> expect it.length .equal 0
        .on 'finish', !-> done!

  it 'vinyl stream input', (done) !->
    stream-should-not-error done,
      with new source!
        ..write '{"Roboto": ["500"]}'
        process.nextTick ..~end
      .pipe vinyl-buffer!
      .pipe gulp-gfonts opts do
        noie8: true
        formats: ttf: true

describe 'processor', (___) ->
  it 'wrong format', ->
    expect ->
      new gulp-gfonts.Processor opts formats: 1
    .to.throw!

    expect ->
      new gulp-gfonts.Processor opts formats: <[WRONG FORMAT]>
    .to.throw!

    expect ->
      new gulp-gfonts.Processor opts formats:
        WRONGFORMAT: true
    .to.throw!

    expect ->
      new gulp-gfonts.Processor opts formats:
        woff2: true
        eot: false
        woff: unknown-key: 'something'
    .to.not.throw!

    expect ->
      new gulp-gfonts.Processor opts formats: <[woff2 eot]>
    .to.not.throw!

  it 'wrong process input', (done) !->
    expect ->
      new gulp-gfonts.Processor opts formats: <[woff2]>
      .process-input do
        'string' + [0 1 4 6 48].map String.from-char-code
        ->
          expect &0 .to.exist
          done!
    .to.not.throw!

  it 'wrong css', (done) !->
    expect ->
      q = new gulp-gfonts.Processor opts formats: <[woff2]>, ___mock-download-css: ->
        &1 null, ['''
          @font-face {}
          @font-face { font-family: 'Roboto'; src: url(some); }
        ''']
      q.process-input 'dummy', ->
        expect (Object.keys q.registry.signatures .length) .equal 1
        for k, v of q.registry.signatures => v.generate!
        done!
    .to.not.throw!

  it 'wrong input', ->
    expect ->
      new gulp-gfonts.Processor opts formats: <[woff2 eot]>
      .prepare-input do
        'string' + [0 1 4 6 48].map String.from-char-code
    .to.throw!

    expect do
      new gulp-gfonts.Processor opts formats: <[woff2 eot]>
      .prepare-input 'family=Roboto:500'
    .equal 'family=Roboto:500'

    expect do
      new gulp-gfonts.Processor opts formats: <[woff2 eot]>
      .prepare-input (JSON.stringify Roboto: <[500 100i]>, 'Open Sans': "100")
    .equal 'family=Roboto:500,100i|Open+Sans:100'

    expect ->
      new gulp-gfonts.Processor opts formats: <[woff2 eot]>
      .prepare-input (JSON.stringify Roboto: {}, 'Open Sans': "100")
    .to.throw!

  it 'font weight', ->
    pfw = gulp-gfonts.Processor.Faces.prepare-font-weight

    expect pfw 400
    .be.a 'number' .and.equal 400

    expect pfw '200'
    .be.a 'number' .and.equal 200

    expect pfw 'Normal'
    .be.a 'number' .and.equal 400

    expect pfw 160
    .be.a 'number' .and.equal 100

    expect pfw 'ikhjkj'
    .be.a 'number' .and.equal 400

  it 'css', ->
    tester = ->
      p = new gulp-gfonts.Processor opts formats: <[woff2 eot]>
      new gulp-gfonts.Processor.Faces p.options, p.formats

    expect ->
      q = tester!
      .add 'font-family': 'Roboto'
      .add 'font-family': 'Roboto'
      expect (Object.keys q.signatures .length) .equal 1
    .to.not.throw!

    expect ->
      tester!add do
        'font-family': 'Roboto'
        'font-style': 'something'
    .to.throw!

    expect -> tester!add 'font-style': 'normal'
    .to.throw!

    expect ->
      with tester!
        ..add 'font-family': 'Roboto', 'src': 'url(http://some.com/font.woff2)'
        ..add 'font-family': 'Roboto', 'src': 'url(http://some.com/font.woff2)'
        expect (Object.keys ..signatures .length) .equal 1
        expect (..signatures[Object.keys ..signatures .0].srcs.length) .equal 1
    .to.not.throw!

    expect ->
      with tester!
        ..add 'font-family': 'Roboto', 'src': 'url(http://some.com/font.ttf)'
        expect (Object.keys ..signatures .length) .equal 1
        expect (..signatures[Object.keys ..signatures .0].srcs.length) .equal 0
    .to.not.throw!

    expect ->
      with tester!
        ..add 'font-family': 'Roboto', 'src': "url(http://some.com/woff2-font) format('woff2')"
        expect (Object.keys ..signatures .length) .equal 1
        expect (..signatures[Object.keys ..signatures .0].srcs.length) .equal 1
    .to.not.throw!

    expect ->
      with tester!
        ..add 'font-family': 'Roboto', 'src': "url(http://some.com/woff2-font)"
        expect (Object.keys ..signatures .length) .equal 1
        expect (..signatures[Object.keys ..signatures .0].srcs.length) .equal 0
    .to.not.throw!

  it 'download wrong font', (done) ->
    tester = ->
      p = new gulp-gfonts.Processor opts formats: <[woff2 eot]>
      new gulp-gfonts.Processor.Faces p.options, p.formats

    expect ->
      with tester!
        ..add 'font-family': 'Roboto', 'src': "url(qweqwe://.ly/font.woff2)"
        expect (Object.keys ..signatures .length) .equal 1
        a = ..signatures[Object.keys ..signatures .0].srcs
        expect (a.length) .equal 1
        a.0.download-font done
    .to.not.throw!
