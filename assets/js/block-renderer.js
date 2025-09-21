/**
 * Fanculo Block Renderer
 * Properly renders server-side content without adding extra wrapper divs
 * Includes security hardening and React key stability
 */

(function() {
    'use strict';

    // Use WordPress globals
    const { createElement, cloneElement } = wp.element;
    const { InnerBlocks } = wp.blockEditor;

    // Safe HTML tags allowlist for XSS prevention
    const SAFE_TAGS = [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
        'section', 'article', 'header', 'footer', 'main', 'aside',
        'nav', 'figure', 'figcaption', 'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'button'
    ];

    // Safe attributes allowlist
    const SAFE_ATTRIBUTES = [
        'class', 'id', 'style', 'title', 'alt', 'src', 'href',
        'target', 'rel', 'data-*', 'aria-*', 'role'
    ];

    // Key generation counter for collision prevention
    let keyCounter = 0;

    /**
     * Generate stable, collision-free keys
     * @param {string} prefix - Key prefix
     * @param {number} index - Element index
     * @returns {string} Unique key
     */
    function generateStableKey(prefix, index) {
        return `${prefix}-${index}-${++keyCounter}`;
    }

    /**
     * Check if tag is safe for rendering
     * @param {string} tagName - HTML tag name
     * @returns {boolean} Whether tag is safe
     */
    function isSafeTag(tagName) {
        return SAFE_TAGS.includes(tagName.toLowerCase());
    }

    /**
     * Check if attribute is safe
     * @param {string} attrName - Attribute name
     * @returns {boolean} Whether attribute is safe
     */
    function isSafeAttribute(attrName) {
        const name = attrName.toLowerCase();
        return SAFE_ATTRIBUTES.some(safe => {
            if (safe.endsWith('*')) {
                return name.startsWith(safe.slice(0, -1));
            }
            return safe === name;
        });
    }

    /**
     * Parse and sanitize DOM attributes
     * @param {Element} domNode - DOM element
     * @returns {Object} Sanitized props object
     */
    function parseAttributes(domNode) {
        const props = {};

        for (const attr of domNode.attributes) {
            if (!isSafeAttribute(attr.name)) {
                continue; // Skip unsafe attributes
            }

            if (attr.name === 'class') {
                props.className = attr.value;
            } else if (attr.name === 'style') {
                // Convert inline style string to object with validation
                const styleObject = {};
                const styles = attr.value.split(';').filter(Boolean);

                for (const stylePair of styles) {
                    const parts = stylePair.split(':');
                    if (parts.length === 2) {
                        const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                        const value = parts[1].trim();

                        // Basic style value validation
                        if (key && value && !value.includes('javascript:')) {
                            styleObject[key] = value;
                        }
                    }
                }
                if (Object.keys(styleObject).length > 0) {
                    props.style = styleObject;
                }
            } else {
                // Handle boolean attributes
                if (attr.value === '' || attr.value === attr.name) {
                    props[attr.name] = true;
                } else {
                    props[attr.name] = attr.value;
                }
            }
        }

        return props;
    }

    // Expose improved renderer globally for Fanculo blocks
    window.FanculoBlockRenderer = {
        /**
         * Legacy method: Create a React component that replaces inserter placeholders with InnerBlocks
         * @deprecated Use renderServerContent instead for better performance and security
         * @param {string} serverContent - HTML content from server
         * @param {Object} blockProps - WordPress block props
         * @param {Object} options - Additional options (for InnerBlocks, etc.)
         * @returns {React.Element} Rendered React element
         */
        createServerContentRenderer: function(serverContent, blockProps, options) {
            options = options || {};

            if (!serverContent) {
                return createElement('div', blockProps);
            }

            // Use the improved renderServerContent method
            return this.renderServerContent(serverContent, blockProps, options);
        },
        /**
         * Parse HTML string and convert to React elements
         * @param {string} htmlString - HTML content to parse
         * @param {Object} options - Options for InnerBlocks parsing
         * @returns {Array} Array of React elements
         */
        parseServerContent: function(htmlString, options = {}) {
            if (!htmlString) return [];

            const container = document.createElement('div');
            container.innerHTML = htmlString.trim();

            const convertDomToReact = (domNode) => {
                if (domNode.nodeType === Node.ELEMENT_NODE) {
                    const tagName = domNode.tagName.toLowerCase();

                    // Security check: only allow safe tags
                    if (!isSafeTag(tagName)) {
                        return null; // Skip unsafe tags
                    }

                    // Handle <innerblocks /> tags
                    if (tagName === 'innerblocks') {
                        const innerBlocksProps = {
                            key: generateStableKey('innerblocks', keyCounter),
                            allowedBlocks: options.allowedBlocks || null,
                            template: options.template || [],
                            templateLock: options.templateLock || false
                        };

                        // Filter out unknown props for InnerBlocks
                        const supportedProps = ['allowedBlocks', 'template', 'templateLock', 'key'];
                        const filteredProps = Object.keys(innerBlocksProps)
                            .filter(key => supportedProps.includes(key))
                            .reduce((obj, key) => {
                                obj[key] = innerBlocksProps[key];
                                return obj;
                            }, {});

                        return createElement(InnerBlocks, filteredProps);
                    }

                    // Handle <div class="fanculo-block-inserter"> elements
                    if (tagName === 'div' && domNode.classList && domNode.classList.contains('fanculo-block-inserter')) {
                        const innerBlocksProps = {
                            key: generateStableKey('fanculo-inserter', keyCounter),
                            allowedBlocks: options.allowedBlocks || null,
                            template: options.template || [],
                            templateLock: options.templateLock || false
                        };

                        // Filter out unknown props for InnerBlocks
                        const supportedProps = ['allowedBlocks', 'template', 'templateLock', 'key'];
                        const filteredProps = Object.keys(innerBlocksProps)
                            .filter(key => supportedProps.includes(key))
                            .reduce((obj, key) => {
                                obj[key] = innerBlocksProps[key];
                                return obj;
                            }, {});

                        return createElement(InnerBlocks, filteredProps);
                    }

                    const children = [];
                    domNode.childNodes.forEach((child, index) => {
                        const element = convertDomToReact(child);
                        if (element !== null) {
                            // Add stable key to child elements
                            if (typeof element === 'object' && element.type) {
                                children.push(cloneElement(element, {
                                    key: element.key || generateStableKey('child', index)
                                }));
                            } else {
                                children.push(element);
                            }
                        }
                    });

                    // Use secure attribute parsing
                    const props = parseAttributes(domNode);

                    // Add stable key for this element
                    props.key = generateStableKey(tagName, keyCounter);

                    return createElement(tagName, props, ...children);
                } else if (domNode.nodeType === Node.TEXT_NODE) {
                    return domNode.textContent;
                }
                return null;
            };

            const elements = [];
            container.childNodes.forEach((node) => {
                const element = convertDomToReact(node);
                if (element !== null) {
                    elements.push(element);
                }
            });

            return elements;
        },

        /**
         * Render server content with proper blockProps application
         * @param {string} serverContent - HTML content from server
         * @param {Object} blockProps - WordPress block props
         * @param {Object} options - Additional options (for InnerBlocks, etc.)
         * @returns {React.Element} Rendered React element
         */
        renderServerContent: function(serverContent, blockProps, options = {}) {
            if (!serverContent) {
                return createElement('div', blockProps);
            }

            // Parse the HTML and apply blockProps to existing element instead of wrapping
            const parsedElements = this.parseServerContent(serverContent, options);

            if (parsedElements.length === 1) {
                const element = parsedElements[0];

                // Guard against text roots - only clone React elements
                if (typeof element === 'object' && element && element.type) {
                    // Merge className and style properly instead of overwriting
                    const mergedProps = { ...blockProps };

                    if (element.props) {
                        // Merge classNames
                        if (element.props.className && blockProps.className) {
                            mergedProps.className = `${element.props.className} ${blockProps.className}`;
                        } else if (element.props.className) {
                            mergedProps.className = element.props.className;
                        }

                        // Merge styles
                        if (element.props.style && blockProps.style) {
                            mergedProps.style = { ...element.props.style, ...blockProps.style };
                        } else if (element.props.style) {
                            mergedProps.style = element.props.style;
                        }
                    }

                    return cloneElement(element, mergedProps);
                } else {
                    // For text nodes or invalid elements, wrap in div
                    return createElement('div', blockProps, element);
                }
            } else {
                // If multiple elements, wrap in div with blockProps
                return createElement('div', blockProps, ...parsedElements);
            }
        },

        /**
         * Create a server-side render component for a block
         * @param {string} blockName - Block name (e.g., 'fanculo/my-block')
         * @param {Object} parserOptions - Options for InnerBlocks parsing
         * @returns {Function} React component function
         */
        createServerRenderComponent: function(blockName, parserOptions = {}) {
            const { useState, useEffect, useMemo, useRef } = wp.element;
            const { useBlockProps } = wp.blockEditor;
            const { Spinner } = wp.components;

            return function ServerRenderComponent(props) {
                const { attributes } = props;
                const [serverContent, setServerContent] = useState("");
                const [isLoading, setIsLoading] = useState(true);
                const abortControllerRef = useRef(null);
                const attributesStringRef = useRef("");

                // Debounced attributes serialization
                const attributesString = useMemo(() => {
                    return JSON.stringify(attributes);
                }, [attributes]);

                useEffect(() => {
                    // Skip if attributes haven't actually changed (debounce)
                    if (attributesString === attributesStringRef.current) {
                        return;
                    }
                    attributesStringRef.current = attributesString;

                    // Abort previous request if still pending
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }

                    // Create new AbortController for this request
                    const abortController = new AbortController();
                    abortControllerRef.current = abortController;

                    const postId = wp.data.select("core/editor").getCurrentPostId() || 0;

                    setIsLoading(true);

                    wp.apiFetch({
                        path: `/wp/v2/block-renderer/${blockName}?context=edit`,
                        method: "POST",
                        data: {
                            attributes: attributes,
                            post_id: postId
                        },
                        signal: abortController.signal
                    }).then(response => {
                        // Only update state if component is still mounted and request wasn't aborted
                        if (!abortController.signal.aborted) {
                            setServerContent(response.rendered);
                            setIsLoading(false);
                        }
                    }).catch(error => {
                        // Only handle errors if request wasn't aborted
                        if (!abortController.signal.aborted) {
                            console.error(`Block render error for ${blockName}:`, error);
                            setServerContent("<div><!-- Block render error --></div>");
                            setIsLoading(false);
                        }
                    });

                    // Cleanup function
                    return () => {
                        if (abortController) {
                            abortController.abort();
                        }
                    };
                }, [attributesString]); // Use attributesString instead of JSON.stringify(attributes)

                const blockProps = useBlockProps();

                // Memoize parsed content without blockProps to avoid pointless re-parses
                const parsedContent = useMemo(() => {
                    if (isLoading || !serverContent) return null;

                    return window.FanculoBlockRenderer.parseServerContent(
                        serverContent,
                        parserOptions
                    );
                }, [serverContent, isLoading, parserOptions]);

                // Apply blockProps to parsed content
                const renderedContent = useMemo(() => {
                    if (!parsedContent) return null;

                    if (parsedContent.length === 1) {
                        const element = parsedContent[0];

                        // Guard against text roots - only clone React elements
                        if (typeof element === 'object' && element && element.type) {
                            // Merge className and style properly instead of overwriting
                            const mergedProps = { ...blockProps };

                            if (element.props) {
                                // Merge classNames
                                if (element.props.className && blockProps.className) {
                                    mergedProps.className = `${element.props.className} ${blockProps.className}`;
                                } else if (element.props.className) {
                                    mergedProps.className = element.props.className;
                                }

                                // Merge styles
                                if (element.props.style && blockProps.style) {
                                    mergedProps.style = { ...element.props.style, ...blockProps.style };
                                } else if (element.props.style) {
                                    mergedProps.style = element.props.style;
                                }
                            }

                            return cloneElement(element, mergedProps);
                        } else {
                            // For text nodes or invalid elements, wrap in div
                            return createElement('div', blockProps, element);
                        }
                    } else {
                        // If multiple elements, wrap in div with blockProps
                        return createElement('div', blockProps, ...parsedContent);
                    }
                }, [parsedContent, blockProps]);

                if (isLoading) {
                    return createElement("div", blockProps,
                        createElement(Spinner)
                    );
                }

                return renderedContent;
            };
        }
    };

    // Legacy compatibility aliases (remove these in future versions)
    window.FanculoInnerBlocksParser = {
        createServerContentRenderer: function(serverContent, blockProps, options) {
            return window.FanculoBlockRenderer.createServerContentRenderer(serverContent, blockProps, options);
        }
    };

    // For backward compatibility
    window.NativeBlocksParser = window.FanculoInnerBlocksParser;

})();