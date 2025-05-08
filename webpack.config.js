const path = require('path');
const webpack = require("webpack");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: "inline-source-map",
  entry: {
    "options/options": './options/options.js',
    "popup/popup": './popup/popup.js',
    "compose_popup": './compose_popup.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser.js",
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.NormalModuleReplacementPlugin(
      /symbol-crypto-wasm-node/,
      path.resolve(__dirname, 'node_modules/symbol-crypto-wasm-web/symbol_crypto_wasm.js')
  ),
  new webpack.DefinePlugin({
    'process.env.SYMBOL_SDK_NO_WASM': JSON.stringify('true')
  }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'necoron.jpg', to: '.' },
        { from: 'options/options.html', to: 'options/' },
        { from: 'options/options.css', to: 'options/' },
        { from: 'popup/popup.html', to: 'popup/' },
        { from: 'popup/popup.css', to: 'popup/' },
        { from: 'compose_popup.html', to: '.' }
      ]
    })
  ],
  resolve: {
   
    extensions: ['.js'],
    fallback: {
        crypto: 'crypto-browserify',
        path: 'path-browserify',
        stream: 'stream-browserify',
        process: require.resolve("process/browser.js"),
        url: require.resolve("url/"),
        buffer: require.resolve("buffer/"),
        assert: require.resolve("assert"),
        vm: require.resolve("vm-browserify"),
        worker_threads: false
    }
},
experiments: {
  // enable async loading of wasm files
  asyncWebAssembly: false,
  topLevelAwait: true
},
module: {
  rules: [
    {
      test: /\.wasm$/,
      type: 'javascript/auto',
      loader: 'null-loader'
    }
  ]
}

};
