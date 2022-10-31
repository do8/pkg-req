const fs = require('fs')
let store = {}
try {
  store = JSON.parse(fs.readFileSync('store.ini'))
  console.log('store init ok')
} catch (error) {
  console.log('store init error', `${error}`)
}
function save_store() {
  fs.writeFileSync('store.ini', JSON.stringify(store))
}
let _save_t
function save() {
  clearTimeout(_save_t)
  _save_t = setTimeout(save_store, 1000)
}
const proxy_store = new Proxy(store, {
  get: function (target, property) {
    if (property == 'save') return save
    if (!target[property]) target[property] = {}
    return target[property]
  },
})
let is_save = false
function exitHandler(options, err) {
  console.log('exitHandler', `${options}`)
  if (err == 'uncaughtException') return
  if (is_save) return
  is_save = true
  save_store()
  console.log('exit save store')
  if (options == 'SIGINT') process.exit(0)
}
process.on('exit', exitHandler)
process.on('SIGINT', exitHandler)
process.on('uncaughtException', exitHandler)
module.exports = proxy_store