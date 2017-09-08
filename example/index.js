const bcrawl = require('../')

const emitter = bcrawl({
  source: 'example/input',
  dest: 'example/output',
  fileName: 'page.js',
  watch: true,
  compress: true,
  browserify: {
    transform: ['babelify']
  }
})

console.log('finding files')
emitter.on('build', (files) => console.log('finished initial build of', files, 'files'))
emitter.on('compile', (file) => console.log('compiled', file))
emitter.on('gzip', (file) => console.log('gzipped', file))
emitter.on('minify', (file) => console.log('minified', file))
emitter.on('update', (file) => console.log('detected update on', file))
emitter.on('error', (err) => console.log('error', err.message))
