/*************************************************
 * Helper functions
 ************************************************/
const _ = require('lodash')
const fs = require('fs')

// Sorting function
function sort(content, field = 'created_at', order = 'asc') {
  content = (order === 'asc')
  ? _.sortBy(content, field)
  : _.sortBy(content, field).reverse()
  return content
}

// Paginate content
function paginateByDivide(content, perPage) {
  function take(n, list) {
    return list.slice(0, n)
  }
  function drop(n, list) {
    return list.slice(n)
  }
  function concat(lists) {
    return Array.prototype.concat.apply(this, lists)
  }
  function divide(n, list) {
    if (list && list.length) {
      var head = take(n, list)
      var tail = drop(n, list)
      return concat.call([head], [divide(n, tail)])
    } else return []
  }

  return divide(n, list).map(function(data, index) {
    return { data }
  })
}

// Basic paginate logic
function paginate(page, content, perPage) {
  let tmp = _.cloneDeep(content)
  let offset = page * perPage

  for (var i = 0; i < offset; i++) {
    tmp.shift()
  }

  for (var i = tmp.length; i > perPage; i--) {
    tmp.pop()
  }
  return tmp
}

function paginateOnStart(content, perPage, {order, orderBy}) {
  let result = {}
  content = sort(content, orderBy, order)
  content.forEach((value, key)=> {
    let page = Math.floor(key/perPage)
    result[page] = result[page] || []
    result[page].push(value)
  })
  return result
}

// Fetch obly needed fields
function onlyFields(content, fields, paginated){
  let response = content

  if (fields && fields.length) {
    if (content && content.length > 0) {
      response = content.map(item => {
        let d = {}
        fields.forEach(field => {
          d[field] = item[field]
        })
        return d
      })
    }
  }
  return response
}

// Load the collections into memory
function loadCollections(path, collection, indexBy){
  return new Promise((resolve, reject) => {
    fs.readdir(path, (er, files) => {
      if (files && files.length > 0) {
        let data = []
        files.forEach(file => {
          let content = require(`${path}/${file}`)
          data.push(content)
        })
        resolve(data)
      } else {
        resolve()
      }
    })
  })
}

module.exports = {
  paginateByDivide,
  paginate,
  paginateOnStart,
  sort,
  onlyFields,
  loadCollections
}
