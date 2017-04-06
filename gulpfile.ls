require! {
  lodash: _
  path

  gulp
  'gulp-debug'
  'gulp-livescript'
  'gulp-changed'
  'gulp-plumber'
  'gulp-spawn-mocha': mocha
}

production = false

gulp.task 'set-dev-node-env', ->
  process.env.NODE_ENV = 'development'

gulp.task 'set-prod-node-env', ->
  production := true
  process.env.NODE_ENV = 'production'

ls-dir = './src'
out-dir = './lib'

gulp.task 'ls', [], ->
  gulp.src path.join ls-dir, '**/*.ls'
  .pipe gulp-plumber!
  .pipe gulp-changed out-dir, extension: '.js'
  .pipe gulp-debug title: 'Compiling ls:'
  .pipe gulp-livescript!
  .pipe gulp.dest out-dir

gulp.task 'ls-watch', <[ls]>, -> gulp.watch [path.join ls-dir, '**/*.ls'], <[ls]>

kill-timeout = null

CI = process.env.CI == 'true'

gulp.task 'do-test', <[ls]>, (next) ->
  gulp.src <[./lib/tests.js]>
  .pipe mocha do
    # debug-brk: !production
    # r: 'test/setup.js'
    R: if CI => 'spec' else 'nyan'
    istanbul: x: 'lib/test*.js'

gulp.task 'do-test-watch', <[ls-watch]>, -> gulp.watch <[lib/*.js]>, <[test]>

gulp.task \test, <[set-prod-node-env do-test]>
gulp.task \dist, <[set-prod-node-env ls]>
gulp.task \default, <[set-dev-node-env ls ls-watch do-test do-test-watch]>
