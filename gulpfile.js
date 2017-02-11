/*eslint no-console:0*/
'use strict';

const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const util = require('gulp-util');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const args = require('yargs').argv;
const gulpif = require('gulp-if');
const less = require('gulp-less');
const minifyCSS = require('gulp-minify-css');

gulp.task('script', () => {
	browserify('./src/script.js', {debug: true})
	.transform("babelify", {presets: ["es2015"]})
	.bundle()
	.on('error', util.log.bind(util, 'Browserify Error'))
	.pipe(source('./script.js'))
	.pipe(buffer())
	.pipe(sourcemaps.init({loadMaps: true}))
	.pipe(gulpif(!args.debug, uglify({mangle: true, preserveComments: 'license'})))
	.pipe(sourcemaps.write('./'))
	.pipe(gulp.dest('./'))
	.on('end', console.log.bind(console, 'BUILT'));
});

gulp.task('sw', () => {
	browserify('./src/sw.js', {debug: true})
	.on('error', util.log.bind(util, 'Browserify Error'))
	.bundle()
	.pipe(source('./sw.js'))
	.pipe(buffer())
	.pipe(sourcemaps.init({loadMaps: true}))
	.pipe(sourcemaps.write('./'))
	.pipe(gulp.dest('./'))
	.on('end', console.log.bind(console, 'BUILT'));
});

gulp.task('build', ['script', 'sw', 'less']);

gulp.task('default', ['build']);

gulp.task('watch', ['build'], () => {
	gulp.watch('src/**/*.js', ['script', 'sw']);
	gulp.watch('src/**/*.less', ['less']);
});

gulp.task('less', () =>
	gulp.src('./src/style.less')
	.pipe(less())
	.pipe(minifyCSS())
	.pipe(gulp.dest('./'))
);
