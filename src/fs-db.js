/**
 *
 * Filesystem Database test
 * @author Ruslan Konev, <konev.lincor@gmail.com>
 * www.justpromotion.ru, 2017
 *
 */

/*************************************************
 * Dependencies
 ************************************************/
import {
  loadCollections,
  onlyFields,
  sort,
  paginateOnStart,
  paginate,
  paginateByDivide
} from './fs-db-helpers'
const EventEmitter = require('events')
const uuid = require('uuid')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')


/*************************************************
 * Main DB class
 * @type {Object}
 ************************************************/
class DB extends EventEmitter {

  constructor() {
    super()
    this.DB = {}
    this.pagedDB = {}
    this.opts = {
      path: path.resolve(process.cwd(), 'stores'),
      perPage: 12,
      schemaFile: '_schemas.js'
    }
    this.Schemas = {}
    this.collection = []
    this.on('error', err => console.error(err))
  }

  connect(opts){
    this.opts = Object.assign(this.opts, opts)
    this.Schemas = require(path.resolve(process.cwd(), this.opts.schemaFile))
    return Promise.all(

      Object.keys(this.Schemas).map( key => {

        return new Promise(
          (resolve,reject)=> {
            let path = `${this.opts.path}/${key}`
            // проверяем наличие пути
            fs.stat(path, (err, stats) => {
              // меряем на ошибку
              if (err || !stats.isDirectory()) {
                fs.mkdir(path, (e) => {
                  !!!e && reject(e) && App.logger.error(`Error create folder for DB key [${key}]`, e)
                  !! e && loadCollections(path, key, this.Schemas[key].primaryKey).then((value) => {
                    resolve({[key]: value})
                  })
                })
              } else {
                // смотрим наличие данных и грузим в память
                loadCollections(path, key, this.Schemas[key].primaryKey).then((value) => {
                  resolve({[key]: value})
                })
              }
            })
          }
        )
      })

    ).then(values => {
      values.forEach((val)=> {
        let key = Object.keys(val)[0]
        // if (this.Schemas[key].paginate) {
          this.pagedDB['_'+key] = {
            order: this.Schemas[key].order || 'desc',
            orderBy: this.Schemas[key].orderBy,
            perPage: this.opts.perPage
          }
          if(val[key]) {
            this.pagedDB[key] = paginateOnStart(val[key], this.opts.perPage, this.pagedDB['_'+key])
          }
        // }
        Object.assign(this.DB, val)
      })
      return Promise.resolve(this.DB)
    })
  }

  write(collection, id, data){
    return new Promise(
      (resolve, reject) => {
        fs.writeFile(`${this.opts.path}/${collection}/${id}.json`,JSON.stringify(data,null,2), err => {
          this.emit('error', err)
          reject(err)
        })
        this.DB[collection] = Object.assign(this.DB[collection], data)
        resolve()
      }
    )
  }

  update(collection, id, data){
    return new Promise(
      (resolve, reject) => {

      }
    )
  }

  delete(collection, id){

  }

  find(query, sort, fields){
    return new Promise(
      (resolve, reject) => {

      }
    )
  }

  get(collection, id, indexBy){
    // если отсутсвует айди — отдаем всю коллекцию
    if (!!!id){
      this.collection = this.DB[collection] || []

    // если отсутствует ключ индексации
    // то вероятно, что надо добавить .жсон и забрать эту запись из коллекции
    } else {
      if (!indexBy) {
        id = id + '.json'
        this.collection = this.DB[collection] && this.DB[collection][id]

      // если мы получили айди без жсон и присутствует ключ коллекции
      // тогда надо сделать перегруппировку данных
      } else if (indexBy) {
        // берем коллекцию
        let coll = this.DB[collection]
        // и перестраиваем
        let tmpCollection = _.groupBy(coll, indexBy)
        // забираем данные по переданному айди.
        // Обращение к нулю — так как groupBy отдает массив
        this.collection = tmpCollection && tmpCollection[id] && tmpCollection[id][0]

      // если есть айди и в нем есть вхождение .json — тогда просто отдаем запись
      } else {
        this.collection = this.DB[collection] && this.DB[collection][id]
      }
    }

    return this
  }


  /**
   * Pagination function
   */
  page(page = 0, order = 'asc', perPage, fields = [], collection) {
    perPage = perPage || this.opts.perPage
    let coll = this.pagedDB[collection]
    let tmp =  coll ? coll[page] : []
    let response = onlyFields(tmp, fields, true)
    return {
      data: response,
      // TODO this.pagedDB - это объект - а необходимо (возможно сделать массив)
      pages: coll ? Object.keys(this.pagedDB[collection]).length : 0
    }
  }

  count(){
    return this.collection.length
  }
}


module.exports = DB
