const crawl = require("../")

const browserifyOpts = {
  transform: ['babelify']
, plugin: []
}

const crawlOpts = {
  input: 'test/input'
, output: 'test/output'
}

crawl(crawlOpts, browserifyOpts)
