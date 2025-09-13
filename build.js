const esbuild = require('esbuild')
const path = require('path')
const { livereloadPlugin } = require('@jgoz/esbuild-plugin-livereload')

const isProduction = process.argv.includes('--production')
const isWatch = process.argv.includes('--watch')

const config = {
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  jsxImportSource: 'react',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'js',
    '.css': 'css',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.gif': 'file',
    '.svg': 'dataurl'
  },
  define: {
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
  },
  sourcemap: !isProduction,
  minify: isProduction,
  metafile: true,
  plugins: [
    ...(isWatch && !isProduction ? [livereloadPlugin({ port: 35729 })] : []),
    {
      name: 'build-logger',
      setup(build) {
        build.onEnd(result => {
          if (result.errors.length > 0) {
            console.error('Build failed with errors:')
            result.errors.forEach(error => console.error(error))
          } else {
            console.log(`✅ Build completed in ${isProduction ? 'production' : 'development'} mode`)

            // Create/remove dev mode marker file
            const fs = require('fs')
            const devMarkerPath = path.join(__dirname, 'dist', '.dev-mode')

            if (isWatch && !isProduction) {
              fs.writeFileSync(devMarkerPath, 'dev')
            } else if (fs.existsSync(devMarkerPath)) {
              fs.unlinkSync(devMarkerPath)
            }

            if (result.metafile) {
              const outputs = Object.keys(result.metafile.outputs)
              outputs.forEach(output => {
                const size = result.metafile.outputs[output].bytes
                console.log(`   ${path.basename(output)}: ${(size / 1024).toFixed(2)} KB`)
              })
            }
          }
        })
      }
    }
  ]
}

async function build() {
  try {
    if (isWatch) {
      const context = await esbuild.context(config)
      await context.watch()
      console.log('👀 Watching for changes...')
      if (!isProduction) {
        console.log('🔄 LiveReload server started on port 35729')
        console.log('💡 LiveReload script will be auto-injected in development mode')
      }
    } else {
      await esbuild.build(config)
    }
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

build()