webpack --config webpack.prod.js --profile --json > stats.json
webpack-bundle-analyzer -h 0.0.0.0 stats.json
