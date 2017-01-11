# browserify-crawl

Recursively crawl through all your JS directories, finding all the main files, and compiling them and outputting them into another directory, preserving the original directory structure. Useful for multi-page apps with different main javascript files to load per-page. Uses watchify and errorify built-in.

PostCSS analog is: [postcss-crawl](https://github.com/jayrbolton/postcss-crawl).

```js
const crawl = require('browserify-crawl')

const browserifyOptions = {
  transform: ['babelify']
}

const crawlOptions = {
  input: 'source/js'
, output: 'dist/js'
}

crawl(crawlOptions, browserifyOptions)
```

Browserify option are the same as those found in the [browserify api docs](https://github.com/substack/node-browserify)

Crawl options (the first set of options), can include:

* `log`: Boolean - whether to print info about the build process **(defaults to true)**
* `watch`: Boolean - whether to watch for file changes and continuously compile files, or to build one-time and exit **(defaults to true)**
* `input`: String - directory path of the source javascript files you want to compile **(required)**
* `output`: String - directory path that you want to put built output files into **(required)**
* `mainFile`: String - filename you want to use for the page/index/parent/main files **(defaults to 'page.js')**
