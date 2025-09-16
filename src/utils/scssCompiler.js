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
 * Get all SCSS partials (global + selected) for a block
 * @param {number} postId - The block post ID
 * @returns {Promise<object>} - Object with global and selected partials
 */
export async function getBlockPartials(postId) {
    try {
        // Get all available partials
        const partialsResponse = await fetch(`${window.wpApiSettings.root}funculo/v1/scss-partials`, {
            headers: {
                'X-WP-Nonce': window.wpApiSettings.nonce,
            },
        });

        if (!partialsResponse.ok) {
            throw new Error('Failed to fetch partials');
        }

        const partialsData = await partialsResponse.json();
        console.log('🔍 Partials data from API:', partialsData);

        // Get block's selected partials
        const blockResponse = await fetch(`${window.wpApiSettings.root}funculo/v1/post/${postId}`, {
            headers: {
                'X-WP-Nonce': window.wpApiSettings.nonce,
            },
        });

        let selectedPartials = [];
        if (blockResponse.ok) {
            const blockData = await blockResponse.json();
            console.log('🔍 Block data from API:', blockData);
            const selectedPartialsString = blockData.meta?.blocks?.selected_partials;
            console.log('🔍 Selected partials string:', selectedPartialsString);
            if (selectedPartialsString) {
                try {
                    selectedPartials = JSON.parse(selectedPartialsString);
                    console.log('✅ Parsed selected partials:', selectedPartials);
                } catch (e) {
                    console.warn('Failed to parse selected partials:', e);
                }
            }
        }

        return {
            globalPartials: partialsData.global_partials || [],
            selectedPartials: selectedPartials || []
        };

    } catch (error) {
        console.error('Error getting block partials:', error);
        return {
            globalPartials: [],
            selectedPartials: []
        };
    }
}

/**
 * Get SCSS content for a specific partial
 * @param {number} partialId - The partial post ID
 * @returns {Promise<string>} - The SCSS content
 */
async function getPartialScssContent(partialId) {
    try {
        const response = await fetch(`${window.wpApiSettings.root}funculo/v1/post/${partialId}`, {
            headers: {
                'X-WP-Nonce': window.wpApiSettings.nonce,
            },
        });

        if (response.ok) {
            const partialData = await response.json();
            return partialData.meta?.scss_partials?.scss || '';
        }
    } catch (error) {
        console.warn(`Failed to fetch SCSS content for partial ${partialId}:`, error);
    }
    return '';
}

/**
 * Build the final SCSS with actual content instead of imports
 * @param {string} userScss - User's SCSS code from Monaco
 * @param {Array} globalPartials - Global partials array
 * @param {Array} selectedPartials - Selected partials array
 * @returns {Promise<string>} - Final SCSS with inlined partials
 */
export async function buildFinalScss(userScss, globalPartials = [], selectedPartials = []) {
    const scssBlocks = [];

    // Add global partials first (sorted by global_order)
    const sortedGlobalPartials = [...globalPartials].sort((a, b) => a.global_order - b.global_order);
    for (const partial of sortedGlobalPartials) {
        const content = await getPartialScssContent(partial.id);
        if (content.trim()) {
            scssBlocks.push(`// Global partial: ${partial.title}`);
            scssBlocks.push(content);
            scssBlocks.push('');
        }
    }

    // Add selected partials (sorted by order)
    const sortedSelectedPartials = [...selectedPartials].sort((a, b) => a.order - b.order);
    for (const partial of sortedSelectedPartials) {
        const content = await getPartialScssContent(partial.id);
        if (content.trim()) {
            scssBlocks.push(`// Selected partial: ${partial.title}`);
            scssBlocks.push(content);
            scssBlocks.push('');
        }
    }

    // Add user's block styles
    if (userScss && userScss.trim()) {
        scssBlocks.push('// Block styles');
        scssBlocks.push(userScss);
    }

    return scssBlocks.join('\n');
}

/**
 * Compile SCSS to CSS with partials support
 * @param {string} scssCode - The SCSS code to compile
 * @param {number} postId - The block post ID (for fetching partials)
 * @param {object} currentPartials - Optional current partials data to avoid API fetch
 * @returns {Promise<string>} - The compiled CSS
 */
export async function compileScss(scssCode, postId = null, currentPartials = null) {
    if (!scssCode || !scssCode.trim()) {
        return scssCode || '';
    }

    try {
        // Initialize SCSS compiler if not already done
        if (!sassCompiler) {
            console.log('🔄 SCSS compiler not initialized, initializing...');
            await initScssCompiler();
        }

        let finalScss = scssCode;

        // If postId is provided, get partials and build final SCSS
        if (postId) {
            let globalPartials = [];
            let selectedPartials = [];

            if (currentPartials) {
                // Use provided current partials data (for real-time compilation)
                console.log('🔄 Using current partials data for compilation...');
                globalPartials = currentPartials.globalPartials || [];
                selectedPartials = currentPartials.selectedPartials || [];
            } else {
                // Fetch from API (for initial load or when no current data available)
                console.log('🔄 Loading partials from API...');
                const partialsData = await getBlockPartials(postId);
                globalPartials = partialsData.globalPartials || [];
                selectedPartials = partialsData.selectedPartials || [];
            }

            if (globalPartials.length > 0 || selectedPartials.length > 0) {
                finalScss = await buildFinalScss(scssCode, globalPartials, selectedPartials);
                console.log(`🔗 Added ${globalPartials.length} global + ${selectedPartials.length} selected partials`);
                console.log('🔍 Final SCSS to compile:\n', finalScss);
            }
        }

        console.log('🔄 Compiling SCSS...');

        // Compile final SCSS to CSS
        const result = await sassCompiler.compileString(finalScss, {
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