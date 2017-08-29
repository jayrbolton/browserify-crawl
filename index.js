const fs = require('fs-extra') // (includes graceful-fs)
const browserify = require('browserify')
const path = require('path')
const glob = require('glob')
const watchify = require('watchify')
const errorify = require('errorify')
const exorcist = require('exorcist')
const zlib = require('zlib')
const UglifyJS = require('uglify-js')

module.exports = function init (opts, callback) {
  opts = configDefaults(opts)
  callback = callback || function () {}
  const pattern = opts.source + '/**/' + opts.fileName
  glob(pattern, {}, function (err, files) {
    if (err) throw err
    var count = 0
    files.forEach(f => {
      compile(f, opts, (path) => {
        count += 1
        if (count === files.length) {
          callback(files)
        }
      })
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
  }
  return opts
}

function compile (inputPath, opts, callback) {
  const outputPath = path.join(opts.dest, path.relative(opts.source, inputPath))
  const b = browserify(Object.assign({entries: inputPath}, opts.browserify))
  const bundle = () => {
    const write = fs.createWriteStream(outputPath)
    b.bundle()
      .pipe(exorcist(outputPath + '.map'))
      .pipe(write)
    write.on('finish', () => {
      if (!opts.compress) {
        logTime('compiled ' + outputPath)
        callback()
        return
      }
      fs.readFile(outputPath, 'utf8', (err, contents) => {
        if (err) throw err
        fs.readFile(outputPath + '.map', 'utf8', (err, map) => {
          if (err) throw err
          const basename = path.basename(outputPath)
          const result = UglifyJS.minify(contents, {
            sourceMap: {
              content: map,
              filename: basename,
              url: basename + '.map'
            }
          })
          fs.writeFile(outputPath, result.code, (err) => {
            if (err) throw err
            gzipIt()
          })
          fs.writeFile(outputPath + '.map', result.map, (err) => { if (err) throw err })
        })
      })
    })
    const gzipIt = () => {
      const write = fs.createWriteStream(outputPath + '.gz')
      fs.createReadStream(outputPath)
        .pipe(zlib.createGzip())
        .pipe(write)
      write.on('finish', () => {
        logTime('compiled ' + outputPath)
        callback()
      })
    }
  }
  fs.ensureDir(path.dirname(outputPath), function (err) {
    if (err) throw err
    bundle()
    if (opts.watch) {
      b.on('update', bundle)
    }
  })
}

const logTime = x => console.log(`[${new Date().toLocaleTimeString()}]`, x)
