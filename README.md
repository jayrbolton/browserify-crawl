# browserify-crawl

Recursively crawls a directory and browserifies multiple files based on filename matching. This is a command-line app for developer convenience, with builtin support for watchify-ing, showing errors, source mapping, and gzipping. It prints out a console log as it goes. It's useful for web apps where you want to browserify many js files at once, watch for any changes, and get some convenient defaults.

There is a PostCSS analog here: [postcss-walk](https://github.com/jayrbolton/postcss-walk).

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
emitter.on('compile', (file) => console.log('compiled', file))
emitter.on('gzip', (file) => console.log('gzipped', file))
emitter.on('minify', (file) => console.log('minified', file))
emitter.on('update', (file) => console.log('detected update on', file))
```

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
* `minify`: a file has finished being minified
* `gzip`: a file has finished being gzipped


## Sample development watcher

```js
const bcrawl = require('browserify-crawl')

const logTime = x => console.log(`[${new Date().toLocaleTimeString()}]`, x)

const emitter = bcrawl({
  fileName: 'page.js',
  source: './client/js',
  dest: './public/client/js',
  watch: true,
  compress: false,
  browserify: {
    paths: ['client'],
    transform: 'es2040',
    insertGlobals: true // minor speed-up
  }
})

logTime('( ﾟヮﾟ) compiling all files')
emitter.on('build', (files) => logTime('(° ͜ʖ °) finished building ' + files.length + ' files... now watching for changes'))
emitter.on('compile', (file) => logTime('compiled ' + file))
```

## Sample production builder

```js
const bcrawl = require('browserify-crawl')

const logTime = x => console.log(`[${new Date().toLocaleTimeString()}]`, x)

const emitter = bcrawl({
  fileName: 'page.js',
  source: './client/js',
  dest: './public/client/js',
  watch: false,
  compress: true,
  browserify: {
    transform: 'es2040',
    paths: ['client']
  }
})

logTime('( ﾟヮﾟ) compiling all files')
emitter.on('build', (files) => logTime('(° ͜ʖ °) finished building ' + files.length + ' files'))
emitter.on('compile', (file) => logTime('compiled ' + file))
```
