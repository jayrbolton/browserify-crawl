const exorcist = require('exorcist')
const zlib = require('zlib')
const fs = require('fs-extra')
const browserify = require('browserify')
const watchify = require('watchify')
const Uglify = require('uglify-js')
const glob = require('glob')
const path = require('path')
const EventEmitter = require('events')
const commonShake = require('common-shakeify')

module.exports = function init (opts) {
  ['fileName', 'source', 'dest'].forEach(prop => {
    if (!opts.hasOwnProperty(prop)) {
      throw new TypeError('You must provide a ' + prop + ' property in options')
    }
  })
  opts.source = path.resolve(opts.source)
  opts.dest = path.resolve(opts.dest)
  opts.emitter = new EventEmitter()
  glob(opts.source + '/**/' + opts.fileName, {}, (err, files) => {
    if (err) opts.emitter.emit('error', err)
    opts.compiledCount = 0
    opts.total = files.length
    files.forEach(inputPath => {
      opts.emitter.emit('found', inputPath)
      const outputPath = path.join(opts.dest, path.relative(opts.source, inputPath))
      compile(inputPath, outputPath, opts)
    })
  })
  return opts.emitter
}

function compile (inputPath, outputPath, opts) {
  const browserifyOpts = Object.assign({
    cache: {},
    packageCache: {},
    plugin: [],
    debug: true,
    entries: [inputPath]
  }, opts.browserify || {})
  if (opts.watch) browserifyOpts.plugin.push(watchify)
  fs.ensureDirSync(path.dirname(outputPath))
  const b = browserify(browserifyOpts)
  if (opts.globalTransform) {
    opts.globalTransform.forEach(t => b.transform(t, {global: true}))
  }
  bundle(outputPath, opts, b)
  b.on('update', () => {
    opts.emitter.emit('update', inputPath)
    bundle(outputPath, opts, b)
  })
}

function bundle (outputPath, opts, b) {
  const write = fs.createWriteStream(outputPath)
  if (opts.unassertify) {
    b.transform('unassertify')
  }
  if (opts.uglifyify) {
    b.transform('uglifyify', {global: true})
  }
  if (opts.commonShakeify) {
    b.plugin(commonShake, {})
  }
  b.bundle()
    .on('error', function (err) {
      opts.emitter.emit('error', err)
      this.emit('end')
    })
    .pipe(exorcist(outputPath + '.map'))
    .pipe(write)

  write.on('finish', (err, x, y) => {
    if (err) opts.emitter.emit('error', err)
    opts.emitter.emit('compile', outputPath)
    if (opts.compress) {
      compress(outputPath, opts)
    } else {
      checkCount(opts)
    }
  })
}

function checkCount (opts) {
  opts.compiledCount += 1
  if (opts.compiledCount === opts.total) {
    opts.emitter.emit('build', opts.total)
  }
}

function compress (outputPath, opts) {
  const code = fs.readFileSync(outputPath, 'utf8')
  const map = fs.readFileSync(outputPath + '.map', 'utf8')
  uglify(outputPath, code, map, opts, () => {
    gzip(outputPath, opts, () => {
      opts.emitter.emit('compress', outputPath)
      checkCount(opts)
    })
  })
}

function uglify (outputPath, code, map, opts, callback) {
  const base = path.basename(outputPath)
  const result = Uglify.minify(code, {
    sourceMap: {
      content: map,
      filename: base,
      url: base + '.map'
    }
  })
  fs.writeFile(outputPath, result.code, err => {
    if (err) throw err
    fs.writeFile(outputPath + '.map', result.map, err => {
      if (err) opts.emitter.emit('error', err)
      callback()
    })
  })
}

function gzip (outputPath, opts, callback) {
  const write = fs.createWriteStream(outputPath + '.gz')
  fs.createReadStream(outputPath)
    .pipe(zlib.createGzip())
    .pipe(write)
  write.on('finish', (err) => {
    if (err) opts.emitter.emit('error', err)
    callback()
  })
}
