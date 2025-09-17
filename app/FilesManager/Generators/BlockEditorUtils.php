<?php

namespace Fanculo\FilesManager\Generators;

class BlockEditorUtils
{
    public static function generate(string $utilsDir): bool
    {
        $utilsJsPath = $utilsDir . '/block-editor-utils.js';

        $content = <<<'JS'
/**
 * Block Editor Utilities for Fanculo Plugin
 *
 * Provides reusable functions for block development including
 * HTML parsing and wrapper div removal logic.
 */
window.FunculoBlockUtils = (function() {
    'use strict';

    const { InnerBlocks } = wp.blockEditor;

    /**
     * Enhanced HTML parser that converts HTML to React elements and handles dynamic content
     * @param {string} htmlString - HTML string to parse
     * @returns {Array} Array of React elements
     */
    function parseStaticHTMLWithDynamic(htmlString) {
        if (!htmlString) return [];

        const container = document.createElement('div');
        container.innerHTML = htmlString.trim();

        // Helper function to convert DOM nodes to React elements
        const convertDomToReact = (domNode) => {
            if (domNode.nodeType === Node.ELEMENT_NODE) {
                const tagName = domNode.tagName.toLowerCase();

                // Handle <innerblocks />
                if (tagName === 'innerblocks') {
                    return wp.element.createElement(InnerBlocks, {
                        key: 'innerblocks',
                        allowedBlocks: null,
                        template: [['core/paragraph', { placeholder: 'Add your content here...' }]]
                    });
                }

                const children = [];
                domNode.childNodes.forEach((child) => {
                    const element = convertDomToReact(child);
                    if (element !== null) {
                        children.push(element);
                    }
                });

                const props = {};
                for (const attr of domNode.attributes) {
                    if (attr.name === 'class') {
                        props.className = attr.value;
                    } else if (attr.name === 'style') {
                        // Convert inline style string to object
                        const styleObject = {};
                        attr.value.split(';').forEach(stylePair => {
                            const parts = stylePair.split(':');
                            if (parts.length === 2) {
                                const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                                styleObject[key] = parts[1].trim();
                            }
                        });
                        props.style = styleObject;
                    } else {
                        props[attr.name] = attr.value;
                    }
                }

                return wp.element.createElement(tagName, props, ...children);
            } else if (domNode.nodeType === Node.TEXT_NODE) {
                return domNode.textContent;
            }
            return null;
        };

        // Convert all top-level nodes
        const elements = [];
        container.childNodes.forEach((node) => {
            const element = convertDomToReact(node);
            if (element !== null) {
                elements.push(element);
            }
        });

        return elements;
    }

    /**
     * Renders block content with smart wrapper removal
     * @param {string} staticContent - HTML content from server-side render
     * @param {Object} blockProps - Block props from useBlockProps()
     * @returns {React.Element} React element to render
     */
    function renderBlockContent(staticContent, blockProps) {
        const parsedElements = parseStaticHTMLWithDynamic(staticContent);

        if (parsedElements.length === 1) {
            // If only one root element, clone it and add blockProps (removes wrapper div)
            return wp.element.cloneElement(parsedElements[0], blockProps);
        } else {
            // If multiple or no root elements, wrap in a div with blockProps
            return wp.element.createElement('div', blockProps, ...parsedElements);
        }
    }

    /**
     * Creates a loading spinner element
     * @param {Object} blockProps - Block props from useBlockProps()
     * @returns {React.Element} Loading spinner element
     */
    function createLoadingElement(blockProps) {
        const { Spinner } = wp.components;

        return wp.element.createElement('div', {
            ...blockProps,
            key: 'loading',
            style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '5px',
                minHeight: '20px'
            }
        }, wp.element.createElement(Spinner));
    }

    /**
     * Fetches block content from server with caching
     * @param {string} blockName - Full block name (e.g., 'fanculo/block-name')
     * @param {Object} attributes - Block attributes
     * @param {Map} cache - Cache map instance
     * @returns {Promise} Promise that resolves to rendered content
     */
    function fetchBlockContent(blockName, attributes, cache) {
        const postId = wp.data.select('core/editor').getCurrentPostId() || 0;
        const cacheKey = `content-${postId}-${JSON.stringify(attributes)}`;

        // Check cache first
        if (cache.has(cacheKey)) {
            return Promise.resolve(cache.get(cacheKey));
        }

        return wp.apiFetch({
            path: `/wp/v2/block-renderer/${blockName}?context=edit`,
            method: 'POST',
            data: {
                attributes: attributes,
                post_id: postId
            }
        }).then(response => {
            // Cache content
            cache.set(cacheKey, response.rendered);
            return response.rendered;
        }).catch(error => {
            console.error('Error fetching content:', error);
            const fallbackContent = '<div></div>';
            cache.set(cacheKey, fallbackContent);
            return fallbackContent;
        });
    }

    /**
     * Gets editable attribute keys from block metadata
     * @param {string} blockName - Full block name (e.g., 'fanculo/block-name')
     * @returns {Array} Array of editable attribute keys
     */
    function getEditableAttributeKeys(blockName) {
        const blockType = wp.blocks.getBlockType(blockName);
        const blockAttributes = blockType?.attributes || {};

        return Object.keys(blockAttributes).filter(key =>
            key !== 'innerContent' &&
            key !== 'content' &&
            key !== 'className' &&
            key !== 'customClassName' &&
            key !== 'lock' &&
            key !== 'metadata' &&
            key !== 'blockCommentId'
        );
    }

    /**
     * Initializes attributes with defaults from block.json
     * @param {string} blockName - Full block name (e.g., 'fanculo/block-name')
     * @param {Object} attributes - Current attributes
     * @param {Function} setAttributes - Function to set attributes
     */
    function initializeBlockAttributes(blockName, attributes, setAttributes) {
        const blockType = wp.blocks.getBlockType(blockName);
        const blockAttributes = blockType?.attributes || {};

        Object.keys(blockAttributes).forEach(attrKey => {
            const attrConfig = blockAttributes[attrKey];
            if (attributes[attrKey] === undefined && attrConfig.default !== undefined) {
                setAttributes({ [attrKey]: attrConfig.default });
            }
        });
    }

    // Public API
    return {
        parseStaticHTMLWithDynamic,
        renderBlockContent,
        createLoadingElement,
        fetchBlockContent,
        getEditableAttributeKeys,
        initializeBlockAttributes
    };
})();
JS;

        // Create directory if it doesn't exist
        if (!is_dir($utilsDir)) {
            if (!mkdir($utilsDir, 0755, true)) {
                error_log("BlockEditorUtils: Failed to create utils directory: $utilsDir");
                return false;
            }
        }

        $result = file_put_contents($utilsJsPath, $content);

        if ($result !== false) {
            error_log("BlockEditorUtils: Successfully created block-editor-utils.js in $utilsDir");
        } else {
            error_log("BlockEditorUtils: Failed to create block-editor-utils.js in $utilsDir");
        }

        return $result !== false;
    }
}