import gulp from 'gulp';

import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import cleanCSS from 'gulp-clean-css';

import rename from 'gulp-rename';
import {deleteAsync} from 'del';
import svgSprite from 'gulp-svg-sprite';
import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';
import plumber from 'gulp-plumber';

import webpackStream from 'webpack-stream';
import browserSync from 'browser-sync';
import htmlmin from 'gulp-htmlmin';

import ghPages from 'gh-pages';



const sass = gulpSass(dartSass);

function scripts() {
    //1. сначала надо взять JavaScript файлы
    //2. при необходимости переписать новый синтаксис с учетом браузерной поддержки 
    //3. минифицировать код
    //4. переименовать, добавить сиффикс min
    //5. сохранить результат в новый файл
    return gulp.src('src/app.js')
    .pipe(webpackStream({
        mode: 'production',
        module: {
            rules: [
              {
                test: /\.(?:js)$/,
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    targets: "defaults",
                    presets: [
                      ['@babel/preset-env']
                    ]
                  }
                }
              }
            ]
          }
    }))
    .pipe(rename('app.min.js'))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream())
}

function server() {
  browserSync.init({
    server: {
      baseDir: 'dist'
    }
  })
}

function watch() {
  gulp.watch(['src/assets/fonts/*', 'src/assets/images/**/*', '!src/assets/images/!(icons)'], copy);
  gulp.watch(['src/assets/images/icons/*'], svg);
  gulp.watch(['src/assets/images/photo/*'], towebp);
  gulp.watch('src/**/*.scss', styles);
  gulp.watch(['src/*.js'], scripts);
  gulp.watch('src/*.html', html);
}

function styles() {
    // 1. взять scss файлы
    // 2. преобразовать код в css
    // 3. сохранить результат
    return gulp.src('src/style.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer(['last 15 version']))
    .pipe(cleanCSS())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream())
}

function html() {
  return gulp.src('src/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(gulp.dest('dist'))
}

function copy() {
    return gulp.src(
      ['src/assets/fonts/*', 
        'src/assets/images/!(icons)/**/*', 
        'src/assets/images/!(icons)',
        'src/apple-touch-icon.png',
        'src/favicon.ico'
      ], 
        {base: 'src', encoding: 'binary'})
        .pipe(gulp.dest('dist', {encoding: 'binary'}))
        .pipe(browserSync.stream({
          once: true
        }))
}

function clean() {
    return deleteAsync(['dist/**'])
}

function svg () {
    return gulp.src('src/assets/images/icons/*.svg')
  .pipe(svgSprite({
    mode: {
        stack: {
            sprite: '../sprite.svg'
        }
    }
  }))
  .pipe(gulp.dest('src/assets/images'));
}

function handleError(err) {
  console.error(err.toString());
  this.emit('end');
}

function towebp () {
  return gulp.src('src/assets/images/photo/*.jpg', { encoding: 'binary' })
    .pipe(plumber({ errorHandler: handleError }))
    .pipe(webp())
    .pipe(imagemin())
    .pipe(gulp.dest('src/assets/images/webp/', { encoding: 'binary' }));
}


export { svg, towebp }

export const build = gulp.series(clean, html, styles, scripts, copy)

export default gulp.series(
  clean, 
  gulp.parallel(svg, towebp), 
  gulp.parallel(html, styles, scripts, copy), 
  gulp.parallel(server, watch)
)
