'use strict';

require('insulin').factory('ndm_testDBSchema', [],
  ndm_testDBSchemaProducer);

function ndm_testDBSchemaProducer() {
  return require('./schema.json');
}

