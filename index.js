const fs = require('fs-extra') // (includes graceful-fs)
const browserify = require('browserify')
const path = require('path')
const glob = require('glob')
const watchify = require('watchify')
const errorify = require('errorify')
const exorcist = require('exorcist')
const zlib = require('zlib')
const UglifyJS = require('uglify-js')
const waterfall = require('run-waterfall')
const parallel = require('run-parallel')

module.exports = function init (opts, callback) {
  opts = configDefaults(opts)
  callback = callback || function () {}
  const pattern = opts.source + '/**/' + opts.fileName
  glob(pattern, {}, function (err, files) {
    if (err) throw err
    const tasks = files.map(f => cb => compile(f, opts, cb))
    waterfall(tasks, (err) => {
      if (err) throw err
      callback()
    })
  })
}

// Set various defaults into the user-supplied configuration object
function configDefaults (opts) {
  ['fileName', 'source', 'dest'].forEach(prop => {
    if (!opts.hasOwnProperty(prop)) {
      throw new TypeError('You must provide a ' + prop + ' property in options')
    }
  })
  opts.browserify = opts.browserify || {}
  opts.source = path.resolve(opts.source)
  opts.dest = path.resolve(opts.dest)
  opts.browserify = Object.assign({
    plugin: [],
    transform: [],
    debug: true
  }, opts.browserify)
  opts.browserify.plugin.push(errorify)
  if (opts.watch) {
    opts.browserify.plugin.push(watchify)
    logTime('👀 watching for changes 👀')
  } else {
    logTime('⚡ starting build ⚡')
  }
  return opts
}

function compile (inputPath, opts, callback) {
  const outputPath = path.join(opts.dest, path.relative(opts.source, inputPath))
  const b = browserify(Object.assign({entries: inputPath}, opts.browserify))
  fs.ensureDir(path.dirname(outputPath), function (err) {
    if (err) throw err
    build()
    if (opts.watch) b.on('update', build)
  })

  function build () {
    const write = fs.createWriteStream(outputPath)
    const smap = exorcist(outputPath + '.map')
    const done = () => {
      logTime('compiled ' + outputPath)
      callback()
    }
    waterfall([
      // Bundle and initial source-map
      (cb) => {
        b.bundle().pipe(smap).pipe(write)
        write.on('finish', cb)
      },
      // Continue only if compress === true
      (cb) => {
        if (opts.compress) cb(null) // continue
        else done()
      },
      // UglifyJS
      (cb) => {
        parallel([
          cb => fs.readFile(outputPath, 'utf8', cb),
          cb => fs.readFile(outputPath + '.map', 'utf8', cb)
        ], (err, results) => cb(err, results[0], results[1]))
      },
      (code, map, cb) => uglify(outputPath, code, map, cb),
      // Gzip it
      (cb) => gzip(outputPath, cb)
    ], done)
  }
}

function gzip (output, callback) {
  const write = fs.createWriteStream(output + '.gz')
  fs.createReadStream(output)
    .pipe(zlib.createGzip())
    .pipe(write)
  write.on('finish', callback)
}

function uglify (output, code, map, callback) {
  const base = path.basename(output)
  const result = UglifyJS.minify(code, {
    sourceMap: {
      content: map,
      filename: base,
      url: base + '.map'
    }
  })
  parallel([
    cb => fs.writeFile(output + '.map', result.map, cb),
    cb => fs.writeFile(output, result.code, cb)
  ], err => callback(err))
}

const logTime = x => console.log(`[${new Date().toLocaleTimeString()}]`, x)
