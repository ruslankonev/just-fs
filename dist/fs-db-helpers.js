'use strict';

/*************************************************
 * Helper functions
 ************************************************/
var _ = require('lodash');
var fs = require('fs');

// Sorting function
function sort(content) {
  var field = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'created_at';
  var order = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'asc';

  content = order === 'asc' ? _.sortBy(content, field) : _.sortBy(content, field).reverse();
  return content;
}

// Paginate content
function paginateByDivide(content, perPage) {
  function take(n, list) {
    return list.slice(0, n);
  }
  function drop(n, list) {
    return list.slice(n);
  }
  function concat(lists) {
    return Array.prototype.concat.apply(this, lists);
  }
  function divide(n, list) {
    if (list && list.length) {
      var head = take(n, list);
      var tail = drop(n, list);
      return concat.call([head], [divide(n, tail)]);
    } else return [];
  }

  return divide(n, list).map(function (data, index) {
    return { data: data };
  });
}

// Basic paginate logic
function paginate(page, content, perPage) {
  var tmp = _.cloneDeep(content);
  var offset = page * perPage;

  for (var i = 0; i < offset; i++) {
    tmp.shift();
  }

  for (var i = tmp.length; i > perPage; i--) {
    tmp.pop();
  }
  return tmp;
}

function paginateOnStart(content, perPage, _ref) {
  var order = _ref.order,
      orderBy = _ref.orderBy;

  var result = {};
  content = sort(content, orderBy, order);
  content.forEach(function (value, key) {
    var page = Math.floor(key / perPage);
    result[page] = result[page] || [];
    result[page].push(value);
  });
  return result;
}

// Fetch obly needed fields
function onlyFields(content, fields, paginated) {
  var response = content;

  if (fields && fields.length) {
    if (content && content.length > 0) {
      response = content.map(function (item) {
        var d = {};
        fields.forEach(function (field) {
          d[field] = item[field];
        });
        return d;
      });
    }
  }
  return response;
}

// Load the collections into memory
function loadCollections(path, collection, indexBy) {
  return new Promise(function (resolve, reject) {
    fs.readdir(path, function (er, files) {
      if (files && files.length > 0) {
        var data = [];
        files.forEach(function (file) {
          var content = require(path + '/' + file);
          data.push(content);
        });
        resolve(data);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  paginateByDivide: paginateByDivide,
  paginate: paginate,
  paginateOnStart: paginateOnStart,
  sort: sort,
  onlyFields: onlyFields,
  loadCollections: loadCollections
};