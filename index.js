const exorcist = require('exorcist')
const zlib = require('zlib')
const R = require('ramda')
const fs = require('fs')
const browserify = require('browserify')
const chalk = require('chalk')
const watchify = require('watchify')
const errorify = require('errorify')
const Uglify = require('uglify-js')

var log = R.identity

const init = (opts, browserifyOpts) => {
  opts = R.merge({
    indexName: 'page.js'
  , input: ''
  , output: ''
  , log: true
  , watch: true
  }, opts)
  if(opts.log) log = console.log.bind(console)
  return walkDir(opts, browserifyOpts)
}

// Recursively walk through a directory, finding all index css files or assets
// Uses a stack, not actual recursion
const walkDir = (opts, browserifyOpts) => {
  const inputRegex = new RegExp("^" + opts.input.replace('/', '\/'))
  var stack = [opts.input]
  var result = {indexFiles: [], directories: []}
  // Tree traversal of directory structure using stack recursion
  while(stack.length) {
    var input = stack.pop()
    const stats = fs.lstatSync(input)
    const filepath = R.replace(inputRegex, '', input)
    if(stats.isDirectory()) {
      // Push all children in the directory to the stack
      const children = R.map(R.concat(input + '/'), fs.readdirSync(input))
      stack.push.apply(stack, children)
      result.directories.push(input)
    } else if(stats.isFile()) {
      if(input.match(new RegExp('\/' + opts.indexName + '$'))) {
        log(chalk.gray('<>  found ' + input))
        createDirs(opts.output + filepath)
        result.indexFiles.push(input)
        compile(input, filepath, opts, browserifyOpts)
      }
    }
  }
  if(!result.indexFiles.length) {
    log(chalk.red('!!  no files in', opts.input, 'with main file ', opts.indexName))
  }
  return result
}

const compile = (input, filepath, opts, browserifyOpts) => {
  browserifyOpts.entries = [input]
  browserifyOpts = R.merge({
    cache: {}
  , packageCache: {}
  , plugin: []
  , debug: true
  }, browserifyOpts)
  var plugins = [errorify]
  if(opts.watch) plugins.push(watchify)
  browserifyOpts.plugin = browserifyOpts.plugin.concat(plugins)
  const b = browserify(browserifyOpts)
  bundle(filepath, opts, b)
  b.on('update', () => bundle(filepath, opts, b))
}

const bundle = (filepath, opts, b) => {
  const bundleStream = fs.createWriteStream(opts.output + filepath)
  const sourceMapUrl = (opts.sourceMapUrl || opts.output) + filepath + '.map'
  b.bundle()
    .pipe(exorcist(opts.output + filepath + '.map', sourceMapUrl))
    .pipe(bundleStream)
  bundleStream.on('finish', postCompile(filepath, sourceMapUrl, opts))
}

// Optionally uglify the compiled output, and generate a source map file
const postCompile = (filepath, sourceMapUrl, opts) => () => {
  const fullPath = opts.output + filepath
  if(opts.uglify) {
    log(chalk.blue('<>  uglifying ' + opts.output + filepath))
    const mapPath = fullPath + '.map'
    fs.renameSync(fullPath, fullPath + '.bundle')
    var result = Uglify.minify(fullPath + '.bundle', {
      inSourceMap: mapPath
    , outSourceMap: mapPath
    , sourceMapUrl: sourceMapUrl
    })
    fs.writeFile(fullPath, result.code, R.identity)
    fs.unlink(fullPath + '.bundle', R.identity)
  }
  if(opts.gzip) {
    // gzip it!
    const gzip = zlib.createGzip()
    log(chalk.blue('<>  gzipping ' + fullPath + '.gz'))
    fs.createReadStream(fullPath)
      .pipe(gzip)
      .pipe(fs.createWriteStream(fullPath + '.gz'))
  }
  log(chalk.green.bold('=>  compiled ' + fullPath))
}

// Create the full directory tree for a file path
const createDirs =
  R.compose(
    R.map(dir => fs.mkdirSync(dir)) // create all missing directory levels
  , R.filter(dir => !fs.existsSync(dir)) // filter out only dirs that do not exist
  , R.dropLast(1) // we don't want the path with the filename at the end (last element in the scan)
  , R.drop(1) // we don't want the first empty string
  , R.map(R.join('/')) // Array of directory levels ['', 'css', 'css/nonprofits', 'css/nonprofits/recurring_donations.css']
  , R.scan((arr, p) => R.append(p, arr), []) // an array of arrays of directory levels [[], ['css'], ['css', 'nonprofits'], ['css', 'nonprofits', 'recurring_donations.css']]
  , R.split('/')
  )

module.exports = init
