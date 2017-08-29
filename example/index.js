const bcrawl = require('../')

const opts = {
  source: 'example/input',
  dest: 'example/output',
  fileName: 'page.js',
  watch: true,
  compress: true,
  browserify: {
    transform: ['babelify']
  }
}

bcrawl(opts, function() {})