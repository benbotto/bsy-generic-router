'use strict';

/**
 * This script sets up the dependency injection container, insulin.
 */
const insulin = require('insulin');

// Static dependencies.
insulin
  .factory('deferred', () => require('deferred'))
  .factory('ndm',      () => require('node-data-mapper'));

// Error classes.
require('bsy-error');

// Application (dynamic) dependencies.
const glob = require('glob');
const opts = {
  cwd: __dirname,
  ignore: [
    './node_modules/**',
    './grunt/**',
    './Gruntfile.js',
    './**/*Spec.js',
    './bootstrap.js',
    './index.js'
  ]
};

const files = glob.sync('./**/*.js', opts);

// Let each file register itself with the DiC.
files.forEach(require);

// Export the list of files.
module.exports = files;

