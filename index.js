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
const jobQueue = require('queue')
// const os = require('os')

module.exports = function init (opts) {
  opts = configDefaults(opts)
  const pattern = opts.source + '/**/' + opts.fileName
  // It seems that adding any concurrency actually makes the compilation much slower on any machine I've tested..
  const queue = jobQueue({concurrency: 1 /*os.cpus().length*/, autostart: true})
  queue.start(err => { if (err) throw err })
  queue.on('error', (err) => {
    opts.emitter.emit('error', err)
  })
  glob(pattern, {}, function (err, files) {
    if (err) throw err
    files.forEach(f => compile(f, opts, queue))
    let compileCount = 0
    queue.on('success', (result) => {
      compileCount += 1
      opts.emitter.emit('compile', result)
      if (compileCount === files.length) {
        opts.emitter.emit('build', files)
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
  opts.source = path.resolve(opts.source)
  opts.dest = path.resolve(opts.dest)
  opts.browserify = Object.assign({
    debug: true,
    plugin: []
  }, opts.browserify || {})
  opts.browserify.plugin.push(errorify)
  return opts
}

// Instantiate a new browserify config object
// .cache and .packageCache must be a new object for every browserify instance
function browserifyDefaults (opts, path) {
  const bopts = Object.assign({
    cache: {},
    packageCache: {}
  }, opts.browserify || {})
  return opts
}

function compile (inputPath, opts, queue) {
  const outputPath = path.join(opts.dest, path.relative(opts.source, inputPath))
  const bopts = browserifyDefaults(opts, inputPath)
  const b = browserify(inputPath, browserifyDefaults(opts.browserify, inputPath))
  if (opts.watch) b.plugin(watchify)
  fs.ensureDir(path.dirname(outputPath), function (err) {
    if (err) throw err
    queue.push((cb) => build(b, opts, outputPath, cb))
  })
  if (opts.watch) {
    b.on('update', (cb) => {
      queue.push((cb) => build(b, opts, outputPath, cb))
      opts.emitter.emit('update', inputPath)
    })
  }
  return b
}

function build (b, opts, output, callback) {
  const write = fs.createWriteStream(output, 'utf8')
  const smap = exorcist(output + '.map')
  waterfall([
    // Bundle and initial source-map
    (cb) => {
      b.bundle().pipe(smap).pipe(write)
      write.on('finish', cb)
    },
    // UglifyJS
    (cb) => {
      if (!opts.compress) return callback(null, output)
      parallel([
        cb => fs.readFile(output, 'utf8', cb),
        cb => fs.readFile(output + '.map', 'utf8', cb)
      ], (err, results) => cb(err, results[0], results[1]))
    },
    (code, map, cb) => {
      uglify(opts, output, code, map, cb)
    },
    // Gzip it
    (cb) => {
      gzip(opts, output, cb)
    }
  ], () => callback(err, output))
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
