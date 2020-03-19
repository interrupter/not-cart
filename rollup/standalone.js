// Rollup plugins
import babel from 'rollup-plugin-babel';
import {eslint} from 'rollup-plugin-eslint';
import filesize from 'rollup-plugin-filesize';

export default {
	input: 'src/standalone/cart.js',
	output:{
		name: 'notCart',
		format: 'iife',
		file: 'dist/notCart.js',
		sourcemap: false,
	},
	plugins: [
		eslint({
			fix: true,
			exclude: ['tmpl/**','build/**', 'node_modules/**', 'css/**', 'js/**', 'test/**', 'bower_components/**', 'assets/*', 'dist/**']
		}),
		babel({
			babelrc: false,
			exclude: ['tmpl/**','build/**', 'node_modules/**', 'css/**', 'js/**', 'test/**', 'bower_components/**', 'assets/*', 'dist/**']
		}),
		filesize()
	]
};
