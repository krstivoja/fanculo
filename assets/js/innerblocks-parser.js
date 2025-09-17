/**
 * Fanculo InnerBlocks Parser Utility
 *
 * Shared utility for parsing HTML content and replacing <InnerBlocks /> tags
 * with actual React InnerBlocks components across all Fanculo blocks.
 */

window.FanculoInnerBlocksParser = (function() {
    'use strict';

    /**
     * Parse HTML content and replace InnerBlocks tags with React components
     *
     * @param {string} htmlContent - The HTML content to parse
     * @param {Object} blockProps - The block props to apply
     * @param {Object} options - Optional configuration
     * @returns {React.Element} - The parsed React element
     */
    function parseHTMLWithInnerBlocks(htmlContent, blockProps, options = {}) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return wp.element.createElement('div', blockProps, 'No content');
        }

        // Configuration options
        const config = {
            allowedBlocks: options.allowedBlocks || ['core/paragraph', 'core/heading', 'core/list'],
            template: options.template || [['core/paragraph', { placeholder: 'Add content...' }]],
            debug: options.debug || false,
            ...options
        };

        // Check if HTML contains any InnerBlocks tags (case-insensitive)
        const innerBlocksPattern = /<innerblocks\s*(?:[^>]*?)?\s*\/?>/gi;
        const hasInnerBlocks = innerBlocksPattern.test(htmlContent);

        if (config.debug) {
            console.log('FanculoInnerBlocksParser - HTML content:', htmlContent);
            console.log('FanculoInnerBlocksParser - Has InnerBlocks:', hasInnerBlocks);
        }

        if (!hasInnerBlocks) {
            // No InnerBlocks - use simple dangerouslySetInnerHTML approach
            return wp.element.createElement('div', {
                ...blockProps,
                dangerouslySetInnerHTML: { __html: htmlContent }
            });
        }

        // Parse HTML with InnerBlocks replacement
        const segments = parseIntoSegments(htmlContent, innerBlocksPattern);

        if (config.debug) {
            console.log('FanculoInnerBlocksParser - Parsed segments:', segments);
        }

        // Convert segments to React elements
        const elements = segments.map((segment, index) => {
            if (segment.type === 'innerblocks') {
                return createInnerBlocksComponent(index, config);
            } else {
                return createHTMLComponent(segment.content, index);
            }
        });

        // Return properly structured component
        return buildFinalComponent(elements, blockProps);
    }

    /**
     * Parse HTML content into segments (HTML and InnerBlocks)
     */
    function parseIntoSegments(htmlContent, pattern) {
        const segments = [];
        let lastIndex = 0;
        let match;

        // Reset regex for global matching
        pattern.lastIndex = 0;

        while ((match = pattern.exec(htmlContent)) !== null) {
            // Add HTML content before the InnerBlocks tag
            if (match.index > lastIndex) {
                const htmlSegment = htmlContent.substring(lastIndex, match.index);
                if (htmlSegment.trim()) {
                    segments.push({
                        type: 'html',
                        content: htmlSegment
                    });
                }
            }

            // Add InnerBlocks component
            segments.push({
                type: 'innerblocks',
                content: match[0]
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining HTML content after last InnerBlocks tag
        if (lastIndex < htmlContent.length) {
            const remainingHtml = htmlContent.substring(lastIndex);
            if (remainingHtml.trim()) {
                segments.push({
                    type: 'html',
                    content: remainingHtml
                });
            }
        }

        return segments;
    }

    /**
     * Create InnerBlocks React component
     */
    function createInnerBlocksComponent(index, config) {
        const innerBlocksProps = {
            key: `innerblocks-${index}`
        };

        // Add configuration if provided
        if (config.allowedBlocks) {
            innerBlocksProps.allowedBlocks = config.allowedBlocks;
        }
        if (config.template) {
            innerBlocksProps.template = config.template;
        }
        if (config.templateLock) {
            innerBlocksProps.templateLock = config.templateLock;
        }

        return wp.element.createElement(wp.blockEditor.InnerBlocks, innerBlocksProps);
    }

    /**
     * Create HTML React component
     */
    function createHTMLComponent(content, index) {
        return wp.element.createElement('span', {
            key: `html-${index}`,
            dangerouslySetInnerHTML: { __html: content }
        });
    }

    /**
     * Build the final React component structure
     */
    function buildFinalComponent(elements, blockProps) {
        if (elements.length > 1) {
            // Multiple segments - wrap in container with blockProps
            return wp.element.createElement('div', blockProps, ...elements);
        } else if (elements.length === 1) {
            // Single element - try to apply blockProps to it if possible
            const element = elements[0];

            // If it's a simple HTML span, try to merge props
            if (element.type === 'span') {
                return wp.element.cloneElement(element, {
                    ...element.props,
                    ...blockProps,
                    key: undefined // Remove key from cloned element
                });
            } else {
                // InnerBlocks component - wrap with blockProps
                return wp.element.createElement('div', blockProps, element);
            }
        } else {
            // No segments - return empty div
            return wp.element.createElement('div', blockProps);
        }
    }

    /**
     * Check if content contains InnerBlocks tags
     */
    function hasInnerBlocks(htmlContent) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return false;
        }
        const pattern = /<innerblocks\s*(?:[^>]*?)?\s*\/?>/gi;
        return pattern.test(htmlContent);
    }

    // Public API
    return {
        parseHTMLWithInnerBlocks: parseHTMLWithInnerBlocks,
        hasInnerBlocks: hasInnerBlocks,
        version: '1.0.0'
    };
})();

// Also make it available as a global for convenience
window.parseHTMLWithInnerBlocks = window.FanculoInnerBlocksParser.parseHTMLWithInnerBlocks;