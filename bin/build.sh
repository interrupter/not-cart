#!/bin/bash
echo 'building for' $ENV 'environment'
rm -rf ./dist/*
NODE_ENV=$ENV ./node_modules/.bin/eslint ./src/standalone/**.js
NODE_ENV=$ENV ./node_modules/.bin/rollup -c ./rollup/standalone.js --environment ENV:$ENV
NODE_ENV=$ENV ./node_modules/.bin/terser --compress --mangle -- dist/notCart.js > ./dist/notCart.min.js
cp -R ./src/standalone/img ./dist/


if [[ $ENV == 'development' ]]
then
cp dist/notCart.js test/browser/assets/cart
cp dist/notCart.min.js test/browser/assets/cart
cp dist/notCart.css test/browser/assets/cart
fi

exit 0;
