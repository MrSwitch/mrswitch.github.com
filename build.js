import {build} from 'esbuild';
import {lessLoader} from 'esbuild-plugin-less';

build({
	entryPoints: ['./src/script.js', './src/style.less', './src/sw.js'],
	bundle: true,
	minify: true,
	target: 'es2020',
	sourcemap: true,
	outdir: './',
	plugins: [lessLoader()], // Just plug in
});
