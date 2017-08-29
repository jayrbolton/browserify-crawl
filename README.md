# browserify-crawl

Recursively crawls a directory and browserifies multiple files based on filename matching. This is a command-line app for developer convenience, with builtin support for watchify-ing, showing errors, source mapping, and gzipping. It prints out a console log as it goes. It's useful for web apps where you want to browserify many js files at once, watch for any changes, and get some convenient defaults.

There is a PostCSS analog here: [postcss-crawl](https://github.com/jayrbolton/postcss-crawl).

```js
const bcrawl = require('browserify-crawl')
bcrawl({
   fileName: 'page.js',
   source: 'client/js',
   dest: 'public/js',
   watch: true,
   compress: true,
   browserify: {
     transforms: ['babelify']
   }
}, callback)
```

## bcrawl(options, callback)

The `options` object can have these properties:

* `source`: path of the input directory containing all your mainfiles (which may be in nested directories). Required.
* `dest`: path of your output directory, typically `public/js`, `dest`, etc. Required.
* `fileName`: name of the main-file(s) that you want to compile. Defaults to `page.js`. These are the root files that you actually want to include in your html in a script element.
* `browserify`: an object of browserify options from the [browserify api](https://github.com/substack/node-browserify)
* `watch`: whether to run watchify on each file to recompile on any changes
* `compress`: whether to uglify & gzip the compiled file (slower)

The callback recieves arguments for `(b, path)`, where `b` is the browserify instance for the file, and `path` is the file's full path. The callback gets called for **every** file, every time the file is finished all of its compiling.

## Sample development watcher

```js
const bcrawl = require('browserify-crawl')

bcrawl({
  fileName: 'page.js',
  source: './client/js',
  dest: './public/client/js',
  watch: true,
  compress: false,
  browserify: {
    paths: ['client'],
    transform: 'es2040',
    insertGlobals: true
  }
})
```

## Sample production builder

```js
const bcrawl = require('browserify-crawl')

bcrawl({
  fileName: 'page.js',
  source: './client/js',
  dest: './public/client/js',
  watch: false,
  compress: true,
  browserify: {
    transform: 'es2040',
    paths: ['client']
  }
}, () => {
  console.log(' --- Done building --- ')
})
```
