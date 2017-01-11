const R = require('ramda')
const fs = require('fs')
const browserify = require('browserify')
const chalk = require('chalk')
const watchify = require('watchify')
const errorify = require('errorify')

let log = ()=>{}

function init(opts, browserifyOpts) {
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
    const output = R.replace(inputRegex, opts.output, input)
    if(stats.isDirectory()) {
      // Push all children in the directory to the stack
      const children = R.map(R.concat(input + '/'), fs.readdirSync(input))
      stack.push.apply(stack, children)
      result.directories.push(input)
    } else if(stats.isFile()) {
      if(input.match(new RegExp('\/' + opts.indexName + '$'))) {
        log(chalk.gray('<>     watching: ' + input))
        createDirs(output)
        result.indexFiles.push(input)
        compile(input, output, opts, browserifyOpts)
      }
    }
  }
  if(!result.indexFiles.length) {
    log(chalk.red('!!     no files found in', opts.input, 'with page file named', opts.indexName))
  }
  return result
}
 
const compile = (input, output, opts, browserifyOpts) => {
  browserifyOpts.entries = [input]
  browserifyOpts = R.merge({
    cache: {}
  , packageCache: {}
  , plugin: []
  }, browserifyOpts)
  browserifyOpts.plugin = browserifyOpts.plugin.concat([watchify, errorify])
  const b = browserify(browserifyOpts)
  const bundle = () => b.bundle().pipe(fs.createWriteStream(output))
  log(chalk.green.bold('=>     compiled: ' + input + ' to ' + output))
  bundle()
  b.on('update', ()=> {
    log(`updated ${input}`)
    log(chalk.green.bold('=>     compiled: ' + input + ' to ' + output))
    bundle()
  })
}

const fileExists = path => {
  try {
    fs.accessSync(path)
    return true
  } catch(e) {
    return false
  }
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

const logCompileErr = err =>
  process.stderr.write(chalk.red('!!        error: ' + err.message + '\n'))

module.exports = init
