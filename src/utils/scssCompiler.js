/**
 * SCSS Compiler for Fanculo Plugin
 * Uses the built SCSS compiler from dist/scss-compiler/
 */

import { apiClient } from './index.js';

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
            await this.loadSassCompiler();
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

            const bundleScript = document.createElement('script');
            bundleScript.src = bundleUrl;
            bundleScript.onload = () => {
                // Load the Dart Sass compiler
                const sassUrl = this.baseUrl + 'dist/scss-compiler/sass.dart.min.js';

                const sassScript = document.createElement('script');
                sassScript.src = sassUrl;
                sassScript.onload = () => {
                    try {
                        // Use the bundled SassCompiler class
                        this.sass = new window.SassBundled.default();
                        this.sass.initialize().then(() => {
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

    try {
        sassCompiler = new FunculoSassCompiler();
        await sassCompiler.initialize();
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
    // Always use optimized batch operation for maximum performance
    const postWithRelated = await apiClient.getPostWithRelated(postId);

    const blockData = postWithRelated.post;
    const partialsData = postWithRelated.related?.scss_partials;

    let selectedPartials = [];
    const selectedPartialsString = blockData.meta?.blocks?.selected_partials;

    if (selectedPartialsString) {
        try {
            selectedPartials = JSON.parse(selectedPartialsString);
        } catch (e) {
            console.error('Failed to parse selected partials:', e);
        }
    }

    return {
        globalPartials: partialsData?.global_partials || [],
        selectedPartials: selectedPartials || []
    };
}

/**
 * Analyze SCSS compilation error and determine which file/section it's in
 * @param {string} errorMessage - Original error message
 * @param {string} finalScss - The compiled SCSS string (unused now)
 * @returns {string} - Enhanced error message with context
 */
function analyzeScssError(errorMessage, finalScss) {
    // Extract line number and error details from original message
    const lineMatch = errorMessage.match(/(\d+)\s*│/);
    if (!lineMatch) {
        return errorMessage; // Can't determine line, return original
    }

    const compiledErrorLine = parseInt(lineMatch[1]);

    // Use the stored line map if available
    const lineMap = window._scssLineMap;
    if (!lineMap) {
        return errorMessage; // No line map available
    }


    // Find the line mapping for this error
    const lineInfo = lineMap.find(mapping => mapping.line === compiledErrorLine);

    if (!lineInfo) {
        return errorMessage; // Line not found in map
    }

    // Extract error details (everything before the line number)
    const errorParts = errorMessage.split('\n');
    const mainError = errorParts[0]; // e.g., 'expected "}".'

    let location = 'Unknown';
    let sourceFile = 'unknown';
    let originalLine = compiledErrorLine;

    // Special handling for "expected }" errors - these often indicate missing closing braces
    // from partials that were included earlier
    if (mainError.includes('expected "}"') || mainError.includes('expected }')) {
        // Look for the most recent partial that was included before this error line
        const recentPartials = lineMap
            .filter(mapping => mapping.line < compiledErrorLine && 
                              (mapping.source === 'global_partial' || mapping.source === 'selected_partial'))
            .sort((a, b) => b.line - a.line); // Sort by line number descending (most recent first)

        if (recentPartials.length > 0) {
            const mostRecentPartial = recentPartials[0];
            
            // Check if this partial might be missing a closing brace
            // Look for the last line of this partial
            const partialLines = lineMap.filter(mapping => 
                mapping.partialId === mostRecentPartial.partialId && 
                mapping.source === mostRecentPartial.source
            );
            
            if (partialLines.length > 0) {
                const lastPartialLine = partialLines[partialLines.length - 1];

                // For "expected }" errors, if there are partials included,
                // it's very likely the error is from a missing closing brace in a partial
                // rather than the main block, especially if the main block is empty or simple
                switch (mostRecentPartial.source) {
                    case 'global_partial':
                        location = `Global Partial: ${mostRecentPartial.partialTitle}`;
                        sourceFile = `Global Partial "${mostRecentPartial.partialTitle}"`;
                        originalLine = mostRecentPartial.originalLine || compiledErrorLine;
                        break;
                    case 'selected_partial':
                        location = `Included Partial: ${mostRecentPartial.partialTitle}`;
                        sourceFile = `Partial "${mostRecentPartial.partialTitle}"`;
                        originalLine = mostRecentPartial.originalLine || compiledErrorLine;
                        break;
                }
            } else {
                // Fall back to normal logic
                switch (lineInfo.source) {
                    case 'global_partial':
                        location = `Global Partial: ${lineInfo.partialTitle}`;
                        sourceFile = `Global Partial "${lineInfo.partialTitle}"`;
                        originalLine = lineInfo.originalLine || compiledErrorLine;
                        break;
                    case 'selected_partial':
                        location = `Included Partial: ${lineInfo.partialTitle}`;
                        sourceFile = `Partial "${lineInfo.partialTitle}"`;
                        originalLine = lineInfo.originalLine || compiledErrorLine;
                        break;
                    case 'main_block':
                        location = 'Main Block SCSS';
                        sourceFile = 'Main Block SCSS';
                        originalLine = lineInfo.originalLine || compiledErrorLine;
                        break;
                }
            }
        } else {
            // No partials found, use normal logic
            switch (lineInfo.source) {
                case 'global_partial':
                    location = `Global Partial: ${lineInfo.partialTitle}`;
                    sourceFile = `Global Partial "${lineInfo.partialTitle}"`;
                    originalLine = lineInfo.originalLine || compiledErrorLine;
                    break;
                case 'selected_partial':
                    location = `Included Partial: ${lineInfo.partialTitle}`;
                    sourceFile = `Partial "${lineInfo.partialTitle}"`;
                    originalLine = lineInfo.originalLine || compiledErrorLine;
                    break;
                case 'main_block':
                    location = 'Main Block SCSS';
                    sourceFile = 'Main Block SCSS';
                    originalLine = lineInfo.originalLine || compiledErrorLine;
                    break;
            }
        }
    } else {
        // Normal error handling for non-brace errors
        switch (lineInfo.source) {
            case 'global_partial':
                location = `Global Partial: ${lineInfo.partialTitle}`;
                sourceFile = `Global Partial "${lineInfo.partialTitle}"`;
                originalLine = lineInfo.originalLine || compiledErrorLine;
                break;
            case 'selected_partial':
                location = `Included Partial: ${lineInfo.partialTitle}`;
                sourceFile = `Partial "${lineInfo.partialTitle}"`;
                originalLine = lineInfo.originalLine || compiledErrorLine;
                break;
            case 'main_block':
                location = 'Main Block SCSS';
                sourceFile = 'Main Block SCSS';
                originalLine = lineInfo.originalLine || compiledErrorLine;
                break;
            case 'comment':
            case 'spacing':
                // For comments/spacing, look at the nearest actual content line
                const nearbyLine = lineMap.find(mapping =>
                    mapping.line >= compiledErrorLine &&
                    (mapping.source === 'global_partial' || mapping.source === 'selected_partial' || mapping.source === 'main_block')
                );
                if (nearbyLine) {
                    switch (nearbyLine.source) {
                        case 'global_partial':
                            location = `Global Partial: ${nearbyLine.partialTitle}`;
                            sourceFile = `Global Partial "${nearbyLine.partialTitle}"`;
                            break;
                        case 'selected_partial':
                            location = `Included Partial: ${nearbyLine.partialTitle}`;
                            sourceFile = `Partial "${nearbyLine.partialTitle}"`;
                            break;
                        case 'main_block':
                            location = 'Main Block SCSS';
                            sourceFile = 'Main Block SCSS';
                            break;
                    }
                    originalLine = nearbyLine.originalLine || compiledErrorLine;
                }
                break;
        }
    }

    // Create new error message with correct line number and source
    const newErrorMessage = `${mainError}
   ╷
${originalLine} │ (error line)
   │  ^
   ╵
  - Line ${originalLine} in ${sourceFile}

📍 Error location: ${location}`;

    return newErrorMessage;
}

/**
 * Get SCSS content for a specific partial
 * @param {number} partialId - The partial post ID
 * @returns {Promise<string>} - The SCSS content
 */
async function getPartialScssContent(partialId) {
    try {
        // Use centralized API client to get partial content
        const partialData = await apiClient.getPost(partialId);
        return partialData.meta?.scss_partials?.scss || '';
    } catch (error) {
        console.warn(`Failed to fetch SCSS content for partial ${partialId}:`, error);
    }
    return '';
}

/**
 * Build the final SCSS with actual content instead of imports and track line mappings
 * @param {string} userScss - User's SCSS code from Monaco
 * @param {Array} globalPartials - Global partials array
 * @param {Array} selectedPartials - Selected partials array
 * @returns {Promise<object>} - Object with finalScss string and lineMap array
 */
export async function buildFinalScss(userScss, globalPartials = [], selectedPartials = []) {
    const scssBlocks = [];
    const lineMap = []; // Track which line belongs to which source
    let currentLine = 1;

    // Add global partials first (sorted by global_order)
    const sortedGlobalPartials = [...globalPartials].sort((a, b) => a.global_order - b.global_order);
    for (const partial of sortedGlobalPartials) {
        const content = await getPartialScssContent(partial.id);
        if (content.trim()) {
            // Add comment line
            scssBlocks.push(`// Global partial: ${partial.title}`);
            lineMap.push({ line: currentLine++, source: 'comment', partialTitle: partial.title });

            // Add content lines
            const contentLines = content.split('\n');
            for (let i = 0; i < contentLines.length; i++) {
                scssBlocks.push(contentLines[i]);
                lineMap.push({
                    line: currentLine++,
                    source: 'global_partial',
                    partialTitle: partial.title,
                    partialId: partial.id,
                    originalLine: i + 1  // Track original line number in the partial
                });
            }

            // Add empty line
            scssBlocks.push('');
            lineMap.push({ line: currentLine++, source: 'spacing' });
        }
    }

    // Add selected partials (sorted by order)
    const sortedSelectedPartials = [...selectedPartials].sort((a, b) => a.order - b.order);
    for (const partial of sortedSelectedPartials) {
        const content = await getPartialScssContent(partial.id);
        if (content.trim()) {
            // Add comment line
            scssBlocks.push(`// Selected partial: ${partial.title}`);
            lineMap.push({ line: currentLine++, source: 'comment', partialTitle: partial.title });

            // Add content lines
            const contentLines = content.split('\n');
            for (let i = 0; i < contentLines.length; i++) {
                scssBlocks.push(contentLines[i]);
                lineMap.push({
                    line: currentLine++,
                    source: 'selected_partial',
                    partialTitle: partial.title,
                    partialId: partial.id,
                    originalLine: i + 1  // Track original line number in the partial
                });
            }

            // Add empty line
            scssBlocks.push('');
            lineMap.push({ line: currentLine++, source: 'spacing' });
        }
    }

    // Add user's block styles
    if (userScss && userScss.trim()) {
        // Add comment line
        scssBlocks.push('// Block styles');
        lineMap.push({ line: currentLine++, source: 'comment' });

        // Add user SCSS lines
        const userLines = userScss.split('\n');
        for (let i = 0; i < userLines.length; i++) {
            scssBlocks.push(userLines[i]);
            lineMap.push({
                line: currentLine++,
                source: 'main_block',
                originalLine: i + 1  // Track original line number in main block
            });
        }
    }

    return {
        finalScss: scssBlocks.join('\n'),
        lineMap: lineMap
    };
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

    let finalScss = scssCode;

    try {
        // Initialize SCSS compiler if not already done
        if (!sassCompiler) {
            await initScssCompiler();
        }

        // If postId is provided, get partials and build final SCSS
        if (postId) {
            let globalPartials = [];
            let selectedPartials = [];

            if (currentPartials) {
                // Use provided current partials data (for real-time compilation)
                globalPartials = currentPartials.globalPartials || [];
                selectedPartials = currentPartials.selectedPartials || [];
            } else {
                // Fetch from API (for initial load or when no current data available)
                const partialsData = await getBlockPartials(postId);
                globalPartials = partialsData.globalPartials || [];
                selectedPartials = partialsData.selectedPartials || [];
            }

            if (globalPartials.length > 0 || selectedPartials.length > 0) {
                const buildResult = await buildFinalScss(scssCode, globalPartials, selectedPartials);
                finalScss = buildResult.finalScss;
                window._scssLineMap = buildResult.lineMap; // Store for error analysis
            } else {
                // Still create a line map for main block only
                const userLines = scssCode.split('\n');
                const lineMap = [];
                for (let i = 0; i < userLines.length; i++) {
                    lineMap.push({
                        line: i + 1,
                        source: 'main_block',
                        originalLine: i + 1
                    });
                }
                window._scssLineMap = lineMap;
            }
        }

        // Compile final SCSS to CSS
        const result = await sassCompiler.compileString(finalScss, {
            style: 'expanded'
        });

        return result.css;

    } catch (error) {
        console.error('❌ SCSS compilation failed:', error.message);

        // Try to determine which file/section the error is in
        let enhancedError = error.message;

        if (postId) {
            enhancedError = analyzeScssError(error.message, finalScss);
        }

        // Create a new error with enhanced message
        const newError = new Error(enhancedError);
        newError.originalError = error;
        throw newError;
    }
}



export default {
    compileScss,
    initScssCompiler
};