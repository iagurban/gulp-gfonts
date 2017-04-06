require! {
  './index': gulp-gfonts

  gulp
  'gulp-concat'
  'merge2': merge
  'gulp-stylus'
  'gulp-debug'
  'through2'

  'vinyl-buffer'

  chai: {expect, assert}

  'vinyl-source-stream': source
}

stream-assert = require 'stream-assert'

opts = -> Object.assign do
  limit-downloads: 2
  it ? {}

stream-should-error = (next, s) ->
  var errored
  errored = v: false, s: null, cnt: 0
  s.on 'error', (.bind null, errored) (errored) ->
    errored.v = true
    next!
  .pipe do
    errored.s = through2.obj (-> console.log it; &2!), (.bind null, errored, next) (errored, next) ->
      expect errored.v .equals true
      errored.s.emit 'finish'
      next!

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

describe 'gulp', (___) ->
  @timeout 2 * 1000

  it 'output css only and empty stream', (done) ->
    test-config-stream Roboto: <[400 100i]>
    .pipe do
      gulp-gfonts opts do
        fonts-stream: ->
          it
          .pipe stream-assert.length 0
          .on 'assertion', !-> expect 'num of files' .equals 0

        embed: true
        formats: <[woff2]>

    .pipe stream-assert.length 1
    .pipe stream-assert.end done

  it 'failing options', (done) ->
    stream-should-error done,
      test-config-stream Roboto: <[400 100i]>
      .pipe gulp-gfonts opts formats: 1

  it 'output css and separate eot in ie8-compatible mode even in full embedded mode', (done) ->
    test-config-stream Roboto: <[400]> .pipe do
      gulp-gfonts opts do
        fonts-stream: ->
          it
          .pipe stream-assert.length 1
          .on 'assertion', !-> expect 'num of files' .equals 1

        embed: false
        formats:
          eot: {embed: true}
          ttf: {embed: true}

    .pipe stream-assert.length 1
    .pipe stream-assert.end done

  it 'fonts-stream => stream vs next', (done) !->
    stream-should-error done,
      test-config-stream Roboto: <[400]> .pipe do
        gulp-gfonts opts do
          fonts-stream: (s, next) ->
            s.pipe gulp.dest '../.tmp'
            .on 'finish', next

          embed: true
          noie8: true
          formats:
            eot: true

  it 'throw error if google responded error', (done) !->
    stream-should-error done,
      test-config-stream Ro11boto: <[400]>
      .pipe do
        gulp-gfonts opts {}

  it 'output css and separate files', (done) ->
      test-config-stream Roboto: <[400]> .pipe do
        gulp-gfonts opts do
          fonts-stream: (it, done) !->
            it
            .pipe expect-files-count -> it > 1
            .on 'assertion', !-> expect 'num of files' .greater 1
            .pipe gulp.dest '../.tmp'
            .on 'end', -> done!

          embed: false
          formats:
            woff2: true
            woff: true
            svg: true

      .pipe stream-assert.length 1
      .pipe stream-assert.end done

  it 'output all', (done) ->
    @timeout 30 * 1000
    test-config-stream Roboto: <[400]>, subset: <[cyrillic]>
    .pipe do
      gulp-gfonts opts do
        embed: false
        formats:
          woff2: true
          svg: true
          eot: true
    .pipe expect-files-count -> it > 4
    .on 'assertion', !->
      expect 'num of files' .greater 4
      done!
    .on 'finish', -> done!

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
    expect gulp-gfonts.Processor.prepare-font-weight 400
    .be.a 'number' .and.equal 400

    expect gulp-gfonts.Processor.prepare-font-weight '200'
    .be.a 'number' .and.equal 200

    expect gulp-gfonts.Processor.prepare-font-weight 'Normal'
    .be.a 'number' .and.equal 400

    expect gulp-gfonts.Processor.prepare-font-weight 160
    .be.a 'number' .and.equal 100

    expect gulp-gfonts.Processor.prepare-font-weight 'ikhjkj'
    .be.a 'number' .and.equal 400

