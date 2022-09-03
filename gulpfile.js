'use strict';

//----------------------------
// モジュール読み込み
//----------------------------
// gulpプラグインを読み込み
const { src, dest, watch, series, parallel } = require('gulp');
// Sassをコンパイルするプラグインを読み込み
const sass = require('gulp-dart-sass');
const postcss = require('gulp-postcss');
const sassGlob = require('gulp-sass-glob-use-forward');
const plumber = require('gulp-plumber');
const debug = require('gulp-debug')
const notify = require('gulp-notify');
const autoprefixer = require('autoprefixer');
const cleancss = require('gulp-clean-css');
const eslint = require('gulp-eslint');
const babel = require('gulp-babel');
const htmlmin = require('gulp-htmlmin');
const browserSync = require('browser-sync');
const objectFit = require('postcss-object-fit-images');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const typescript = require('gulp-typescript');
const filepath = {
  src: 'src/',
  dist: 'dist/'
}
const filesrc = {
  html: `${filepath.src}**/*.html`,
  js: `${filepath.src}**/*.js`,
  css: `${filepath.src}sass/**/**.scss`,
  ts: `${filepath.src}lib/**/**.ts`
}

//----------------------------
// 各種関数定義
//----------------------------

// CSSコンパイル
const compileSass = () => {
  // style.scssファイルを取得
  return src(filesrc.css)
    // sassのエラー時でもwatchを止めない
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    // Sassのコンパイルを実行
    // Sassの@use/@forwardを省略
    .pipe(sassGlob())
    .pipe(
      // コンパイル後のCSSを展開
      sass({
        outputStyle: 'expanded'
      }))
    // prefixを付与
    .pipe(postcss([autoprefixer({
      cascade: false
    })
    ]))
    // Ofi対応
    .pipe(postcss([objectFit]))
    // 圧縮前のcssを出力
    .pipe(dest(`${filepath.src}assets/css`))
    // CSS圧縮の実行
    .pipe(cleancss())
    // distフォルダに保存(お好きなフォルダを指定してください)
    .pipe(dest(`${filepath.dist}assets/css`));
}

// htmlコンパイル
const compilehtml = () => {
  return src(filesrc.html)
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(dest(filepath.dist));
}

// JavaScirptコンパイル
const compileJS = () => {
  return src(filesrc.js)
    .pipe(plumber())
    .pipe(babel({
      presets: ['@babel/env']
    }))
    // JavaScript -eslint
    .pipe(eslint({
      useEslintrc: true
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(uglify())
    .pipe(dest(`${filepath.dist}`))
}


// TypeScriptコンパイル
const tsProject = typescript.createProject('tsconfig.json', {noImplicitAny: true});
const compileTS = () => {
  return src(filesrc.ts)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write())
    .pipe(dest(`${filepath.src}assets/js`))
}

// ローカルサーバー立ち上げ
const browserSyncFunc = () => {
  browserSync.init(browserSyncOption);
}

const browserSyncOption = {
  server: {
    baseDir: 'src',
  },
  open: true,
  reloadOnRestart: true,
}

const browserSyncReload = (done) => {
  browserSync.reload();
  done();
}

//----------------------------
// Sassフォルダ/html/jsに変更があったら、コンパイルをします
//----------------------------

const watchFiles = () => {
  watch(filesrc.css, series(compileSass, browserSyncReload));
  watch(filesrc.html, series(compilehtml, browserSyncReload));
  watch(filesrc.ts, series(compileTS, browserSyncReload));
  watch(filesrc.js, series(compileJS, browserSyncReload));
}

// npx gulpというコマンドを実行時、watchSassFilesが実行されるようにします
// exports.default = watchFiles;
exports.default = series(series(compileSass, compileTS, compileJS), parallel(watchFiles, browserSyncFunc));
