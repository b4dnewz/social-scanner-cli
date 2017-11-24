'use strict';

const _ = require('lodash');

/**
 * Sort an object properties by his keys values alphabetically
 * @param  {object} object The object to sort
 * @return {object}        The object with properties sorted by key alphabetically
 */
module.exports.sortObjectKeys = function(object) {
  const keys = Object.keys(object);
  const sortedKeys = _.sortBy(keys);
  return _.fromPairs(_.map(sortedKeys, key => [key, object[key]]));
};

/**
 * Reduce object properties that match given array values
 * @param  {object} object The object to reduce
 * @param  {array} array The array of keys to match
 * @return {object}        The object with properties sorted by key alphabetically
 */
module.exports.reduceObject = function(object, array) {
  return array.reduce((obj, g) => {
    if (Object.prototype.hasOwnProperty.call(object, g)) {
      obj[g] = object[g];
    }
    return obj;
  }, {});
};
