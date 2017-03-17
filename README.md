# browserify-crawl

This library is our "ideal build script" wrapped up into a module. It supports all of the following:
* Crawls a tree of directories, finds all your main-files
* Bundles them with Browserify using any transforms/plugins (uses errorify)
* Creates an external source map with exorcist
* Can optionally uglify the result (+ sourcemap)
* Can optionally gzip the result 
* Can optionally use watchify to hang and watch for changes on any file

There is a PostCSS analog here: [postcss-crawl](https://github.com/jayrbolton/postcss-crawl).

## crawl(options, browserifyOptions)

The `options` object can have these properties:

* `input`: path of the input directory containing all your mainfiles (which may be in nested directories). Required.
* `output`: path of your output directory, typically `public/js`, `dist`, etc. Required.
* `indexName`: name of the main-file(s) that you want to get bundle. Defaults to `page.js`
* `log`: Boolean whether to print log messages. Defaults to `true`
* `watch`: Boolean whether to use watchify and watch for changes to files. Defaults to `false`
* `sourceMapUrl`: Url prefix that will be used to access sourcemaps. Defaults to the output path
* `uglify`: Whether to uglify your code after browserifying it. Defaults to `false`
* `gzip`: Whether to gzip your code (will save to `output/filename.js.gz`). Defaults to `false`.

The second parameter, `browserifyOptions`, takes the options from the [browserify api](https://github.com/substack/node-browserify), such as `transform`.

```js
const crawl = require('browserify-crawl')

const browserifyOptions = {
  transform: 'es2040'
}

const crawlOptions = {
  input: 'source/js'
, output: 'dist/js'
, gzip: true
, uglify: true
, watch: false
, sourceMapUrl: '/js'
}

crawl(crawlOptions, browserifyOptions)
```

