var gulp = require('gulp');
var webpack = require('webpack');
var path = require('path');
var fs = require('fs');
var DeepMerge = require('deep-merge');
var nodemon = require('nodemon');
var WebpackDevServer = require("webpack-dev-server");
var gutil = require('gulp-util');

var deepmerge = DeepMerge(function(target, source, key) {
  if(target instanceof Array) {
    return [].concat(target, source);
  }
  return source;
});

var defaultConfig = {
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: ['babel-loader'], query: { presets:['es2015', 'stage-0', 'react'] } },
    ]
  }
};

if(process.env.NODE_ENV !== 'production') {
  defaultConfig.devtool = '#eval-source-map';
  defaultConfig.debug = true;
}

function config(overrides) {
  return deepmerge(defaultConfig, overrides || {});
}

// frontend

var frontendConfig = config({
  entry: './client/main.js',
  output: {
    path: path.join(__dirname, 'client/build'),
    filename: 'main.js'
  }
});

// backend

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

var backendConfig = config({
  entry: './server/main.js',
  target: 'node',
  output: {
    path: path.join(__dirname, 'server/build'),
    filename: 'main.js'
  },
  node: {
    __dirname: true,
    __filename: true
  },
  externals: nodeModules,
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.BannerPlugin('require("source-map-support").install();',
                             { raw: true, entryOnly: false })
  ]
});

// tasks

function onBuild(done) {
  return function(err, stats) {
    if(err) {
      console.log('Error', err);
    }
    else {
      console.log(stats.toString());
    }

    if(done) {
      done();
    }
  }
}

gulp.task('frontend-build', function(done) {
  webpack(frontendConfig).run(onBuild(done));
});

gulp.task('frontend-watch', function() {
  webpack(frontendConfig).watch(100, onBuild());
});

gulp.task('backend-build', function(done) {
  webpack(backendConfig).run(onBuild(done));
});

gulp.task('backend-watch', function() {
  webpack(backendConfig).watch(100, function(err, stats) {
    onBuild()(err, stats);
    nodemon.restart();
  });
});

gulp.task("webpack-dev-server", function(callback) {
    new WebpackDevServer(webpack(frontendConfig), {
    }).listen(8080, "localhost", function(err) {
        if(err) throw new gutil.PluginError("webpack-dev-server", err);
        // Server listening
        gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html");

        // keep the server alive or continue?
        // callback();
    });
});

gulp.task('build', ['frontend-build', 'backend-build']);
gulp.task('watch', ['frontend-watch', 'backend-watch']);

gulp.task('run', ['backend-watch', 'frontend-watch'], function() {
  nodemon({
    execMap: {
      js: 'node'
    },
    script: path.join(__dirname, 'build/backend'),
    ignore: ['*'],
    watch: ['foo/'],
    ext: 'noop'
  }).on('restart', function() {
    console.log('Restarted!');
  });
});
