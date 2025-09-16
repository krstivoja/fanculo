// Self-hosted Dart Sass wrapper for browser usage
// This wrapper loads the official Dart Sass and makes it available globally

(function() {
  'use strict';
  
  // Load immutable first (required by Dart Sass)
  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = function() {
      console.error('Failed to load script:', src);
    };
    document.head.appendChild(script);
  }
  
  // Initialize Dart Sass
  function initializeSass() {
    return new Promise((resolve, reject) => {
      // Choose between minified (production) or source (debugging) version
      // Set to true for debugging, false for production
      const useSourceVersion = false;
      const immutableScript = useSourceVersion ? './dist/assets/immutable.js' : './dist/assets/immutable.min.js';
      
      // Load immutable first
      loadScript(immutableScript, function() {
        console.log(`Immutable.js loaded (${useSourceVersion ? 'source' : 'minified'} version)`);
        
        // Load sass.dart.min.js (minified for smaller size)
        loadScript('./dist/assets/sass.dart.min.js', function() {
          console.log('Dart Sass core loaded (minified)');
          
          try {
            // Get the Sass library from global exports
            const _cliPkgLibrary = globalThis._cliPkgExports.pop();
            if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;
            
            const _cliPkgExports = {};
            _cliPkgLibrary.load({immutable: window.Immutable}, _cliPkgExports);
            
            // Make Sass available globally
            window.sass = {
              compile: _cliPkgExports.compile,
              compileString: _cliPkgExports.compileString,
              compileAsync: _cliPkgExports.compileAsync,
              compileStringAsync: _cliPkgExports.compileStringAsync,
              info: _cliPkgExports.info
            };
            
            console.log('Dart Sass initialized successfully!');
            resolve(window.sass);
            
          } catch (error) {
            console.error('Failed to initialize Sass:', error);
            reject(error);
          }
        });
      });
    });
  }
  
  // Export initialization function
  window.initSass = initializeSass;
})(); 