'use strict';

/**
 * This script sets up the dependency injection container, insulin.
 */
const insulin = require('insulin');
const scripts = (require('./grunt/scriptGarner.js'))().app;

// Static dependencies.
insulin
  .factory('deferred', () => require('deferred'));

// Data mapper.
require('node-data-mapper');

// Error classes.
require('bsy-error');

// Application (dynamic) dependencies.
scripts.forEach(script => require(script));

// Export the list of files.
module.exports = scripts;

