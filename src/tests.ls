require! {
  './index': gulp-gfonts

  gulp
  'gulp-concat'
  'merge2': merge
  'gulp-stylus'
  'gulp-debug'
  'through2'

  chai: {expect, assert}
}

stream-assert = require 'stream-assert'

opts = -> Object.assign do
  limit-downloads: 2
  it ? {}

stream-should-error = ->
  through2.obj (-> &2!), ->
    expect 'not got this point' .equals true

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

describe 'embedding', (___) ->
  @timeout 2 * 1000

  it 'output css only and empty stream', (done) ->
    gulp.src '' .pipe do
      gulp-gfonts opts do
        query: 'family=Roboto:400'
        fonts-stream: ->
          it
          .pipe stream-assert.length 0
          .on 'assertion', !-> expect 'num of files' .equals 0
          .pipe gulp.dest '../.tmp'

        embed: true
        formats:
          woff2: true

    .pipe stream-assert.length 1
    .pipe stream-assert.end done

  it 'output css and separate eot in ie8-compatible mode even in full embedded mode', (done) ->
    gulp.src '' .pipe do
      gulp-gfonts opts do
        query: 'family=Roboto:400'
        fonts-stream: ->
          it
          .pipe stream-assert.length 1
          .on 'assertion', !-> expect 'num of files' .equals 1
          .pipe gulp.dest '../.tmp'

        embed: true
        formats:
          woff2: true
          eot: true

    .pipe stream-assert.length 1
    .pipe stream-assert.end done

  it 'fonts-stream => stream vs next', (done) ->
    gulp.src '' .pipe do
      gulp-gfonts opts do
        query: 'family=Roboto:400'
        fonts-stream: (s, next) ->
          s.pipe gulp.dest '../.tmp'
          .on 'end', next

        embed: true
        noie8: true
        formats:
          eot: true

    .on 'error', -> done!
    .pipe stream-should-error!

  it 'throw error if google responded error', (done) ->
    gulp.src ''
    .pipe do
      gulp-gfonts opts do
        query: 'family=Ro11boto:400'
        formats:
          woff2: true
    .on 'error', -> done!
    .pipe stream-should-error!

  it 'output css and separate files', (done) ->
      gulp.src '' .pipe do
        gulp-gfonts opts do
          query: 'family=Roboto:400'
          fonts-stream: ->
            it
            .pipe expect-files-count -> it > 1
            .on 'assertion', !-> expect 'num of files' .greater 1
            .pipe gulp.dest '../.tmp'

          embed: false
          formats:
            woff2: true
            woff: true
            svg: true

      .pipe stream-assert.length 1
      .pipe stream-assert.end done

  it 'output all', (done) ->
    @timeout 30 * 1000
    gulp.src ''
    .pipe do
      gulp-gfonts opts do
        query: 'family=Roboto:400&subset=cyrillic'
        embed: false
        formats:
          woff2: true
          svg: true
          eot: true
    .pipe expect-files-count -> it > 4
    .on 'assertion', !-> expect 'num of files' .greater 4
    .pipe gulp.dest '../.tmp'
    .on 'end', -> done!
