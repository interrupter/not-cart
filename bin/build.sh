#!/bin/bash
echo 'building for' $ENV 'environment'
rm -R ./test/browser/dist/*
NODE_ENV=$ENV ./node_modules/.bin/eslint ./src/standalone/**.js
NODE_ENV=$ENV ./node_modules/.bin/rollup -c ./rollup/standalone.js --environment ENV:$ENV
NODE_ENV=$ENV ./node_modules/.bin/terser --compress --mangle -- dist/notCart.js > ./dist/notCart.min.js
