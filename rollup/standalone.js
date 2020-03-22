// Rollup plugins
import commonjs from "rollup-plugin-commonjs";
import babel from 'rollup-plugin-babel';
import {
  eslint
} from 'rollup-plugin-eslint';
import filesize from 'rollup-plugin-filesize';
import istanbul from 'rollup-plugin-istanbul';
import resolve from "rollup-plugin-node-resolve";


export default {
  input: 'src/standalone/cart.js',
  output: {
    name: 'notCart',
    format: 'iife',
    file: 'dist/notCart.js',
    sourcemap: false,
  },
  plugins: [
    eslint({
      fix: true,
      exclude: ['tmpl/**', 'build/**', 'node_modules/**', 'css/**', 'js/**', 'test/**', 'bower_components/**', 'assets/*', 'dist/**']
    }),
		(process.env.ENV === 'test' && resolve()),
    (process.env.ENV === 'test' &&
    babel({
      presets: [
        [
          "@babel/preset-env",
          {
            corejs: 3,
            modules: false,
            useBuiltIns: "usage",
            targets: {
              ie: "11"
            }
          }
        ]
      ],
      babelrc: false,
      runtimeHelpers: true,
      plugins: [
        "@babel/transform-arrow-functions",
        [
          "@babel/transform-runtime",{
            "regenerator": true,
          }
        ]
      ],
      exclude: ['tmpl/**', 'build/**', 'node_modules/**', 'css/**', 'js/**', 'test/**', 'bower_components/**', 'assets/*', 'dist/**']
    })),
    (process.env.ENV === 'test' && istanbul({
      exclude: ['node_modules/**', 'node_modules/@babel/runtime/helpers/**', 'node_modules/@babel/runtime/regenerator/**', 'node_modules/regenerator-runtime/**']
    })),
    (process.env.ENV === 'test' && commonjs()),
    filesize()
  ]
};
