/**
 * SCSS Compiler for Fanculo Plugin
 * Uses the built SCSS compiler from dist/scss-compiler/
 */

let sassCompiler = null;

/**
 * Get the base URL for loading SCSS compiler assets
 */
function getPluginBaseUrl() {
    // Try to use WordPress localized script data if available
    if (window.funculoSettings && window.funculoSettings.pluginUrl) {
        return window.funculoSettings.pluginUrl;
    }

    // Try to find the plugin URL from script tags
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        if (script.src && script.src.includes('/fanculo/')) {
            const pluginUrl = script.src.substring(0, script.src.indexOf('/fanculo/')) + '/fanculo/';
            return pluginUrl;
        }
    }

    // Fallback: try to construct from current location
    const currentUrl = window.location.origin + window.location.pathname;
    if (currentUrl.includes('/wp-admin/')) {
        const baseUrl = currentUrl.substring(0, currentUrl.indexOf('/wp-admin/')) + '/wp-content/plugins/fanculo/';
        return baseUrl;
    }

    // Last resort fallback
    return '/wp-content/plugins/fanculo/';
}

/**
 * SCSS Compiler class that works with the Fanculo plugin
 */
class FunculoSassCompiler {
    constructor() {
        this.sass = null;
        this.isInitialized = false;
        this.baseUrl = getPluginBaseUrl();
    }

    async initialize() {
        if (this.isInitialized) return this.sass;

        try {
            console.log('🔄 Loading Fanculo SCSS compiler...');
            await this.loadSassCompiler();
            console.log('✅ Fanculo SCSS compiler initialized successfully!');
            this.isInitialized = true;
            return this.sass;
        } catch (error) {
            console.error('❌ Failed to initialize SCSS compiler:', error);
            throw error;
        }
    }

    async loadSassCompiler() {
        return new Promise((resolve, reject) => {
            // Load the bundled SCSS compiler from dist/scss-compiler/
            const bundleUrl = this.baseUrl + 'dist/scss-compiler/sass-bundle.min.js';
            console.log('📦 Loading SCSS bundle from:', bundleUrl);

            const bundleScript = document.createElement('script');
            bundleScript.src = bundleUrl;
            bundleScript.onload = () => {
                console.log('✅ SCSS bundle loaded');

                // Load the Dart Sass compiler
                const sassUrl = this.baseUrl + 'dist/scss-compiler/sass.dart.min.js';
                console.log('📦 Loading Dart Sass from:', sassUrl);

                const sassScript = document.createElement('script');
                sassScript.src = sassUrl;
                sassScript.onload = () => {
                    try {
                        console.log('✅ Dart Sass loaded, initializing...');

                        // Use the bundled SassCompiler class
                        this.sass = new window.SassBundled.default();
                        this.sass.initialize().then(() => {
                            console.log('✅ SCSS compiler ready!');
                            resolve(this.sass);
                        }).catch(reject);

                    } catch (error) {
                        console.error('❌ Error initializing SCSS compiler:', error);
                        reject(error);
                    }
                };
                sassScript.onerror = () => {
                    console.error('❌ Failed to load Dart Sass from:', sassUrl);
                    reject(new Error('Failed to load Dart Sass'));
                };
                document.head.appendChild(sassScript);
            };
            bundleScript.onerror = () => {
                console.error('❌ Failed to load SCSS bundle from:', bundleUrl);
                reject(new Error('Failed to load SCSS bundle'));
            };
            document.head.appendChild(bundleScript);
        });
    }

    async compileString(scss, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return this.sass.compileString(scss, {
            style: 'expanded',
            ...options
        });
    }
}

/**
 * Initialize the SCSS compiler
 */
async function initScssCompiler() {
    if (sassCompiler) {
        return sassCompiler;
    }

    console.log('🚀 Initializing Fanculo SCSS compiler...');

    try {
        sassCompiler = new FunculoSassCompiler();
        await sassCompiler.initialize();

        console.log('✅ Fanculo SCSS compiler initialized successfully!');
        return sassCompiler;

    } catch (error) {
        console.error('❌ Failed to initialize Fanculo SCSS compiler:', error);
        throw error;
    }
}

/**
 * Compile SCSS to CSS
 * @param {string} scssCode - The SCSS code to compile
 * @returns {Promise<string>} - The compiled CSS
 */
export async function compileScss(scssCode) {
    if (!scssCode || !scssCode.trim()) {
        return scssCode || '';
    }

    try {
        // Initialize SCSS compiler if not already done
        if (!sassCompiler) {
            console.log('🔄 SCSS compiler not initialized, initializing...');
            await initScssCompiler();
        }

        console.log('🔄 Compiling SCSS...');

        // Compile SCSS to CSS
        const result = await sassCompiler.compileString(scssCode, {
            style: 'expanded'
        });

        console.log('✅ SCSS compiled successfully!');
        return result.css;

    } catch (error) {
        console.error('❌ SCSS compilation failed:', error.message);
        console.log('🔄 Returning original SCSS as fallback');
        return scssCode; // Return original on error
    }
}

/**
 * Save SCSS and compiled CSS via the API
 * @param {number} postId - The post ID
 * @param {string} scssContent - The SCSS content
 * @param {string} cssContent - The compiled CSS content
 * @returns {Promise<object>} - The API response
 */
export async function saveScssAndCss(postId, scssContent, cssContent) {
    try {
        const response = await fetch(`${window.wpApiSettings.root}funculo/v1/post/${postId}/scss`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': window.wpApiSettings.nonce,
            },
            body: JSON.stringify({
                scss_content: scssContent,
                css_content: cssContent,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving SCSS and CSS:', error);
        throw error;
    }
}

/**
 * Get SCSS and CSS content from the API
 * @param {number} postId - The post ID
 * @returns {Promise<object>} - The SCSS and CSS content
 */
export async function getScssContent(postId) {
    try {
        const response = await fetch(`${window.wpApiSettings.root}funculo/v1/post/${postId}/scss`, {
            method: 'GET',
            headers: {
                'X-WP-Nonce': window.wpApiSettings.nonce,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting SCSS content:', error);
        throw error;
    }
}

export default {
    compileScss,
    saveScssAndCss,
    getScssContent,
    initScssCompiler
};