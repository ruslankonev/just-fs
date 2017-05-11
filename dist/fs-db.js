'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fsDbHelpers = require('./fs-db-helpers');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Filesystem Database test
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @author Ruslan Konev, <konev.lincor@gmail.com>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * www.justpromotion.ru, 2017
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

/*************************************************
 * Dependencies
 ************************************************/


var EventEmitter = require('events');
var uuid = require('uuid');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

/*************************************************
 * Main DB class
 * @type {Object}
 ************************************************/

var DB = function (_EventEmitter) {
  _inherits(DB, _EventEmitter);

  function DB() {
    _classCallCheck(this, DB);

    var _this = _possibleConstructorReturn(this, (DB.__proto__ || Object.getPrototypeOf(DB)).call(this));

    _this.DB = {};
    _this.pagedDB = {};
    _this.opts = {
      path: path.resolve(process.cwd(), 'stores'),
      perPage: 12,
      schemaFile: '_schemas.js'
    };
    _this.Schemas = {};
    _this.collection = [];
    _this.on('error', function (err) {
      return console.error(err);
    });
    return _this;
  }

  _createClass(DB, [{
    key: 'connect',
    value: function connect(opts) {
      var _this2 = this;

      this.opts = Object.assign(this.opts, opts);
      this.Schemas = require(path.resolve(process.cwd(), this.opts.schemaFile));
      return Promise.all(Object.keys(this.Schemas).map(function (key) {

        return new Promise(function (resolve, reject) {
          var path = _this2.opts.path + '/' + key;
          // проверяем наличие пути
          fs.stat(path, function (err, stats) {
            // меряем на ошибку
            if (err || !stats.isDirectory()) {
              fs.mkdir(path, function (e) {
                !!!e && reject(e) && App.logger.error('Error create folder for DB key [' + key + ']', e);
                !!e && (0, _fsDbHelpers.loadCollections)(path, key, _this2.Schemas[key].primaryKey).then(function (value) {
                  resolve(_defineProperty({}, key, value));
                });
              });
            } else {
              // смотрим наличие данных и грузим в память
              (0, _fsDbHelpers.loadCollections)(path, key, _this2.Schemas[key].primaryKey).then(function (value) {
                resolve(_defineProperty({}, key, value));
              });
            }
          });
        });
      })).then(function (values) {
        values.forEach(function (val) {
          var key = Object.keys(val)[0];
          // if (this.Schemas[key].paginate) {
          _this2.pagedDB['_' + key] = {
            order: _this2.Schemas[key].order || 'desc',
            orderBy: _this2.Schemas[key].orderBy,
            perPage: _this2.opts.perPage
          };
          if (val[key]) {
            _this2.pagedDB[key] = (0, _fsDbHelpers.paginateOnStart)(val[key], _this2.opts.perPage, _this2.pagedDB['_' + key]);
          }
          // }
          Object.assign(_this2.DB, val);
        });
        return Promise.resolve(_this2.DB);
      });
    }
  }, {
    key: 'write',
    value: function write(collection, id, data) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        fs.writeFile(_this3.opts.path + '/' + collection + '/' + id + '.json', JSON.stringify(data, null, 2), function (err) {
          _this3.emit('error', err);
          reject(err);
        });
        _this3.DB[collection] = Object.assign(_this3.DB[collection], data);
        resolve();
      });
    }
  }, {
    key: 'update',
    value: function update(collection, id, data) {
      return new Promise(function (resolve, reject) {});
    }
  }, {
    key: 'delete',
    value: function _delete(collection, id) {}
  }, {
    key: 'find',
    value: function find(query, sort, fields) {
      return new Promise(function (resolve, reject) {});
    }
  }, {
    key: 'get',
    value: function get(collection, id, indexBy) {
      // если отсутсвует айди — отдаем всю коллекцию
      if (!!!id) {
        this.collection = this.DB[collection] || [];

        // если отсутствует ключ индексации
        // то вероятно, что надо добавить .жсон и забрать эту запись из коллекции
      } else {
        if (!indexBy) {
          id = id + '.json';
          this.collection = this.DB[collection] && this.DB[collection][id];

          // если мы получили айди без жсон и присутствует ключ коллекции
          // тогда надо сделать перегруппировку данных
        } else if (indexBy) {
          // берем коллекцию
          var coll = this.DB[collection];
          // и перестраиваем
          var tmpCollection = _.groupBy(coll, indexBy);
          // забираем данные по переданному айди.
          // Обращение к нулю — так как groupBy отдает массив
          this.collection = tmpCollection && tmpCollection[id] && tmpCollection[id][0];

          // если есть айди и в нем есть вхождение .json — тогда просто отдаем запись
        } else {
          this.collection = this.DB[collection] && this.DB[collection][id];
        }
      }

      return this;
    }

    /**
     * Pagination function
     */

  }, {
    key: 'page',
    value: function page() {
      var _page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      var order = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'asc';
      var perPage = arguments[2];
      var fields = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
      var collection = arguments[4];

      perPage = perPage || this.opts.perPage;
      var coll = this.pagedDB[collection];
      var tmp = coll ? coll[_page] : [];
      var response = (0, _fsDbHelpers.onlyFields)(tmp, fields, true);
      return {
        data: response,
        // TODO this.pagedDB - это объект - а необходимо (возможно сделать массив)
        pages: coll ? Object.keys(this.pagedDB[collection]).length : 0
      };
    }
  }, {
    key: 'count',
    value: function count() {
      return this.collection.length;
    }
  }]);

  return DB;
}(EventEmitter);

module.exports = DB;