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
const EventEmitter = require('events')

module.exports = function init (opts) {
  opts = configDefaults(opts)
  const pattern = opts.source + '/**/' + opts.fileName
  glob(pattern, {}, function (err, files) {
    if (err) throw err
    const tasks = files.map(f => cb => compile(f, opts, cb))
    let initial = true
    waterfall(tasks, (err) => {
      if (err) throw err
      if (initial) {
        opts.emitter.emit('build', files)
        initial = false
      }
    })
  })
  return opts.emitter
}

// Set various defaults into the user-supplied configuration object
function configDefaults (opts) {
  ['fileName', 'source', 'dest'].forEach(prop => {
    if (!opts.hasOwnProperty(prop)) {
      throw new TypeError('You must provide a ' + prop + ' property in options')
    }
  })
  opts.emitter = new EventEmitter()
  opts.browserify = opts.browserify || {}
  opts.source = path.resolve(opts.source)
  opts.dest = path.resolve(opts.dest)
  opts.browserify = Object.assign({
    plugin: [],
    transform: [],
    cache: {},
    packageCache: {},
    debug: true
  }, opts.browserify)
  opts.browserify.plugin.push(errorify)
  if (opts.watch) {
    opts.browserify.plugin.push(watchify)
  }
  return opts
}

function compile (inputPath, opts, callback) {
  const outputPath = path.join(opts.dest, path.relative(opts.source, inputPath))
  const b = browserify(inputPath, opts.browserify)
  const done = () => {
    opts.emitter.emit('compile', outputPath)
    callback()
  }
  if (opts.watch) {
    b.on('update', () => {
      opts.emitter.emit('update', inputPath)
      build(b, opts, outputPath, done)
    })
  }
  fs.ensureDir(path.dirname(outputPath), function (err) {
    if (err) throw err
    build(b, opts, outputPath, done)
  })
}

function build (b, opts, output, done) {
  const write = fs.createWriteStream(output, 'utf8')
  const smap = exorcist(output + '.map')
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
        cb => fs.readFile(output, 'utf8', cb),
        cb => fs.readFile(output + '.map', 'utf8', cb)
      ], (err, results) => cb(err, results[0], results[1]))
    },
    (code, map, cb) => uglify(opts, output, code, map, cb),
    // Gzip it
    (cb) => gzip(opts, output, cb)
  ], (err) => {
    if (err) throw err
    done()
  })
}

function gzip (opts, output, callback) {
  const write = fs.createWriteStream(output + '.gz')
  fs.createReadStream(output)
    .pipe(zlib.createGzip())
    .pipe(write)
  write.on('finish', (err) => {
    opts.emitter.emit('gzip', output)
    callback(err)
  })
}

function uglify (opts, output, code, map, callback) {
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
  ], err => {
    opts.emitter.emit('minify', output)
    callback(err)
  })
}
