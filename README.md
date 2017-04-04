# gulp-gfonts
> A gulp plugin for smart downloading fonts from Google Fonts© or other CDNs and generating CSS for them

## Usage

Install `gulp-gfonts` as a development dependency:

```shell
npm install --save-dev gulp-fonts
```

Then in `gulpfile.js`:

### Use all avalilible formats
```javascript
var gfonts = require('gulp-gfonts');

gulp.task('fonts', function () {
  gulp.src('')
    .pipe(gfonts({
      query: 'family=Roboto:100,400,900&subset=cyrillic'
    }))
    .pipe(gulp.dest('./dist')); // => ./dist/fonts.css, ./dist/*.woff, ./dist/*.eot, etc.
});
```

### Pack woff2 fonts to css-file
```javascript
gulp.task('fonts', function () {
  gulp.src('')
    .pipe(gfonts({
      query: 'family=Roboto:100,400,900&subset=cyrillic',
      embed: true,
      formats: ['woff2']
    }))
    .pipe(gulp.dest('./dist')); // => ./dist/fonts.css
});
```

### Pack fonts to css-file, download eot for <ie9 separately, concat css
```javascript
gulp.task('fonts', function () {
  var fstream =
    gulp.src('')
    .pipe(gfonts({
      query: 'family=Roboto:100,400,900&subset=cyrillic',
      fontsStream: function (s) {
        return s.pipe(gulp.dest('./static/fonts')); // => ./static/fonts/*.eot
      },
      inCssBase: './fonts', // to be served like domain.com/fonts/blah.eot
      embed: true
    }));
  // fstream contain only css file when fontsStream is present

  var sstream = gulp.src('./app.styl').pipe(gulp-stylus());

  merge2(fstream, sstream)
  .pipe(gulp-concat('index.css'))
  .pipe(gulp.dest('./static'))
});
```
