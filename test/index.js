const fs = require('fs-extra')
const tape = require('tape')
const bcrawl = require('../')
const waterfall = require('run-waterfall')

tape('it compiles mainfiles', (t) => {
  const main = `
    var x = require('./x.js')
    module.exports = 112358
  `
  const x = `
    module.exports = 123321
  `
  const nested = `
    module.exports = 420420
  `
  waterfall([
    (cb)    => fs.remove('./test/input', cb),
    (cb)    => fs.remove('./test/output', cb),
    (cb)    => fs.ensureDir('./test/input', cb),
    (_, cb) => fs.ensureDir('./test/input/nested', cb),
    (_, cb) => fs.writeFile('./test/input/main.js', main, cb),
    (cb)    => fs.writeFile('./test/input/x.js', x, cb),
    (cb)    => fs.writeFile('./test/input/nested/main.js', nested, cb),
    (cb)    => {
      bcrawl({fileName: 'main.js', source: './test/input', dest: './test/output', compress: true}, (files) => {
        cb(null)
      })
    },
    (cb) => fs.readFile('./test/output/main.js', 'utf8', cb),
    (contents, cb) => {
      t.assert(contents.match('112358'), 'compiles plain js file')
      cb(null)
    },
    (cb) => fs.readFile('./test/output/nested/main.js', 'utf8', cb),
    (contents, cb) => {
      t.assert(contents.match('420420'), 'compiles nested plain js file')
      cb(null)
    },
    (cb) => fs.readFile('./test/output/main.js', 'utf8', cb),
    (contents, cb) => {
      t.assert(contents.match('123321'), 'includes requires')
      cb(null)
    },
    (cb) => {
      t.assert(fs.existsSync('./test/output/main.js.gz'), 'creates gzip')
      cb(null)
    },
    (cb) => {
      t.assert(fs.existsSync('./test/output/main.js.map'), 'creates map')
      cb(null)
    }
  ], (err) => {
    if (err) throw err
    t.end()
  })
})

