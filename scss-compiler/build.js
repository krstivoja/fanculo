#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  log(`✓ Copied: ${path.basename(src)} → ${dest}`, 'green');
}

function getPackageVersion(packageName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(`node_modules/${packageName}/package.json`, 'utf8'));
    return packageJson.version;
  } catch (e) {
    return 'unknown';
  }
}

async function build() {
  // log('🏗️  Building SCSS Live Compiler...', 'blue');
  
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
    log('✓ Cleaned dist directory', 'green');
  }
  fs.mkdirSync('dist', { recursive: true });

  // Get package versions for documentation
  const sassVersion = getPackageVersion('sass');
  const immutableVersion = getPackageVersion('immutable');
  
  log(`📦 Using Sass v${sassVersion}`, 'yellow');
  log(`📦 Using Immutable v${immutableVersion}`, 'yellow');

  // 1. Copy and minify Dart Sass
  log('🔧 Processing Dart Sass...', 'blue');
  const sassSource = 'node_modules/sass/sass.dart.js';
  const sassMinified = 'dist/sass.dart.min.js';
  
  if (!fs.existsSync(sassSource)) {
    log('❌ Error: sass.dart.js not found in node_modules/sass/', 'red');
    process.exit(1);
  }

  // Minify Dart Sass
  log('⚡ Minifying Dart Sass (this may take a moment)...', 'yellow');
  execSync(`npx terser ${sassSource} --compress --mangle --output ${sassMinified}`);
  
  const originalSize = (fs.statSync(sassSource).size / 1024 / 1024).toFixed(1);
  const minifiedSize = (fs.statSync(sassMinified).size / 1024 / 1024).toFixed(1);
  const savings = ((1 - fs.statSync(sassMinified).size / fs.statSync(sassSource).size) * 100).toFixed(0);
  
  log(`✓ Dart Sass minified: ${originalSize}MB → ${minifiedSize}MB (${savings}% smaller)`, 'green');

  // 2. Bundle dependencies with esbuild (tree-shaking!)
  log('📦 Bundling dependencies with esbuild...', 'blue');
  
  try {
    execSync(`npx esbuild src/bundle.js --bundle --minify --target=es2020 --format=iife --global-name=SassBundled --outfile=dist/sass-bundle.min.js`, {
      stdio: 'inherit'
    });
    
    const bundleSize = (fs.statSync('dist/sass-bundle.min.js').size / 1024).toFixed(1);
    log(`✓ Dependencies bundled and tree-shaken: ${bundleSize}KB`, 'green');
    
    // Also create a development version (not minified, easier to debug)
    execSync(`npx esbuild src/bundle.js --bundle --target=es2020 --format=iife --global-name=SassBundled --outfile=dist/sass-bundle.js`, {
      stdio: 'inherit'
    });
    
    const devBundleSize = (fs.statSync('dist/sass-bundle.js').size / 1024).toFixed(1);
    log(`✓ Development bundle created: ${devBundleSize}KB (readable)`, 'green');
    
  } catch (error) {
    log(`❌ esbuild failed: ${error.message}`, 'red');
    process.exit(1);
  }
  
  // 3. Legacy wrapper no longer needed (using esbuild bundle instead)
  
  // 4. CSS is now static in root (no compilation needed)

  // 5. HTML remains in root and references dist/ directly
  log('📄 HTML stays in root, references built assets in dist/', 'blue');

  // 6. Create build info
  const buildInfo = {
    buildDate: new Date().toISOString(),
    versions: {
      sass: sassVersion,
      immutable: immutableVersion
    },
    files: {
      'sass.dart.min.js': `${minifiedSize}MB (${savings}% smaller than original)`,
      'sass-bundle.min.js': `${(fs.statSync('dist/sass-bundle.min.js').size / 1024).toFixed(1)}KB (tree-shaken)`,
      'sass-bundle.js': `${(fs.statSync('dist/sass-bundle.js').size / 1024).toFixed(1)}KB (readable)`
    },
    staticFiles: {
      'styles.css': `${(fs.statSync('styles.css').size / 1024).toFixed(1)}KB (static)`
    }
  };
  
  fs.writeFileSync('dist/build-info.json', JSON.stringify(buildInfo, null, 2));
  log('✓ Build info created', 'green');

  // Calculate total size
  const totalSize = fs.readdirSync('dist')
    .reduce((total, file) => {
      const filePath = path.join('dist', file);
      if (fs.statSync(filePath).isFile()) {
        return total + fs.statSync(filePath).size;
      }
      return total;
    }, 0);

  log('\n🎉 Build complete!', 'green');
  log(`📊 Total dist size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`, 'yellow');
  log('📁 Files built in dist/ directory', 'blue');
  log('💡 Run "npm run serve" to test the built version', 'yellow');
}

// Run build
build().catch(error => {
  log(`❌ Build failed: ${error.message}`, 'red');
  process.exit(1);
}); 