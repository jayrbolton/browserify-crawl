# browserify-crawl

Recursively crawls a directory and browserifies, watches, source-maps, displays errors, minifies, and gzips multiple files based on filename matching. This is a pre-configured utility for developer convenience that is still very customizable.

```js
const bcrawl = require('browserify-crawl')
const emitter = bcrawl({
   fileName: 'page.js',
   source: 'client/js',
   dest: 'public/js',
   watch: true,
   compress: true,
   browserify: {
     transforms: ['babelify']
   }
})

console.log('finding files')
emitter.on('build', (files) => console.log('finished initial build of', files.length, 'files'))
emitter.on('update', (file) => console.log('detected update on', file))
emitter.on('compile', (file) => console.log('compiled', file))
emitter.on('compress', (file) => console.log('compressed', file))
emitter.on('error', (err) => console.log('error', err.message))
```

The above will find **all** files named `page.js` in the `client/js` directory, even nested ones. It will then recreate a mirror directory structure in `public/js` with all the compiled files.

For example, if you have `client/js/page.js` and `client/js/dashboard/page.js`, then the compiler will create `public/js/page.js` and `public/js/dashboard/page.js`, which will be the built versions of the files. The compiler will also create `public/js/page.js.map`, `public/js/page.js.gz`, `public/js/dashboard/page.js.map`, and `public/js/dashboard/page.js.gz`.

## bcrawl(options)

The `options` object can have these properties:

* `source`: path of the input directory containing all your mainfiles (which may be in nested directories). Required.
* `dest`: path of your output directory, typically `public/js`, `dest`, etc. Required.
* `fileName`: name of the main-file(s) that you want to compile. Defaults to `page.js`. These are the root files that you actually want to include in your html in a script element.
* `browserify`: an object of browserify options from the [browserify api](https://github.com/substack/node-browserify)
* `watch`: whether to run watchify on each file to recompile on any changes
* `compress`: whether to uglify & gzip the compiled file (slower)

The return value is an [event emitter](https://nodejs.org/api/events.html) that allows you to listen to the following events:

* `compile`: a file has finished compling. Callback receives the full file path.
* `build`: the full set of files have finished the initial build. Callback receives an array of all file paths
* `update`: a file has been updated but not yet compiled
* `compress`: a file has finished being minified and gzipped
* `error`: an error has been caught, most likely a browserify parse error


## Sample development watcher

```js
const bcrawl = require('browserify-crawl')

const emitter = bcrawl({
  source: process.argv[2] || './client/js',
  dest: './public/client/js',
  compress: false,
  watch: true,
  fileName: 'page.js',
  browserify: {
    debug: true,
    paths: ['./client'],
    insertGlobals: true // minor speed-up
  }
})

const logTime = x => console.log(`[${new Date().toLocaleTimeString()}]`, x)
const time = new Date()
logTime('( ﾟヮﾟ) compiling all files')
emitter.on('build', (files)  => logTime('(° ͜ʖ °) finished building ' + files + ' files in ' + (new Date() - time) / 1000 + ' seconds... now watching for changes'))
emitter.on('compile', (file) => logTime('compiled ' + file))
emitter.on('update', (file)  => logTime('updated  ' + file))
emitter.on('error', (err)  => logTime('error  ' + err.message))
```

## Sample production builder

```js
const bcrawl = require('browserify-crawl')

const emitter = bcrawl({
  source: process.argv[2] || './client/js',
  dest: './public/client/js',
  compress: true,
  watch: false,
  fileName: 'page.js',
  browserify: {
    transform: 'es2040',
    paths: ['./client']
  }
})

const logTime = x => console.log(`[${new Date().toLocaleTimeString()}]`, x)
const time = new Date()
logTime('( ﾟヮﾟ) compiling all files')
emitter.on('build', (files)  => logTime('(° ͜ʖ °) finished building ' + files + ' files in ' + (new Date() - time) / 1000 + ' seconds!'))
emitter.on('compile', (file) => logTime('compiled ' + file))
emitter.on('error', (err)  => logTime('error  ' + err.message))
```
