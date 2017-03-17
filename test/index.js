const crawl = require("../")

const browserifyOpts = {
  transform: ['babelify']
, plugin: []
}

const crawlOpts = {
  input: 'test/input'
, output: 'test/output'
, uglify: true
}

crawl(crawlOpts, browserifyOpts)
