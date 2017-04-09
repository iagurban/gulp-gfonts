# gulp-gfonts [![Build Status](https://travis-ci.org/iagurban/gulp-gfonts.svg?branch=master)](https://travis-ci.org/iagurban/gulp-gfonts)
> A gulp plugin for smart downloading fonts from Google Fonts© and generating CSS for/with them

## Usage

1. Install `gulp-gfonts` (as a development dependency in most cases):

```shell
npm install --save-dev gulp-fonts
```

2. Create json-file with definitions for needed fonts:

```json
{ "Roboto": ["300", "300i", "500", "800"] }
```

or

```json
{ "Open Sans": "300,300i,500,500i,800,800i" }
```

or just copy url's query from Google Fonts constructor

```json
family=Roboto:500,100i|Open+Sans:100
```

3. Then in `gulpfile.js`:

### Use all avalilible formats
```javascript
var gfonts = require('gulp-gfonts');

gulp.task('fonts', function () {
  gulp.src('fonts.json')
    .pipe(gfonts())
    .pipe(gulp.dest('./dist')); // => ./dist/fonts.css, ./dist/*.woff, ./dist/*.eot, etc.
});
```

### Pack woff2 fonts to css-file
```javascript
gulp.task('fonts', function () {
  gulp.src('fonts.json')
    .pipe(gfonts({
      embed: true,
      formats: ['woff2']
    }))
    .pipe(gulp.dest('./dist')); // => ./dist/fonts.css
});
```

### Pack fonts to css-file, download eot for <ie9 separately, concat css
```javascript
gulp.task('fonts', function () {
  s =
    gulp.src('fonts.json')
    .pipe(gfonts({
      inCssBase: './fonts', // to be served like domain.com/fonts/blahblah.eot
      embed: true
    }))
    .pipe(gulp-hydra({
      css: (f) => /.*\.css$/.test(f.path),
      fonts: (f) => !(/.*\.css$/.test(f.path))
    }));

  s.fonts.pipe(gulp.dest('./static/fonts')); // => ./static/fonts/*.eot

  merge2(
    gulp.src('./app.styl').pipe(gulp-stylus()),
    s.css
  )
  .pipe(gulp-concat('index.css'))
  .pipe(gulp.dest('./static')); // => ./static/index.css
});
```
