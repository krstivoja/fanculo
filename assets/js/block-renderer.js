/**
 * Fanculo Block Renderer
 * Properly renders server-side content without adding extra wrapper divs
 */

(function() {
    'use strict';

    // Use WordPress globals
    const { createElement, cloneElement, isValidElement } = wp.element;
    const { InnerBlocks } = wp.blockEditor;

    // Utility functions
    function normalizeAttributeName(name) {
        const attributeMap = {
            'class': 'className',
            'for': 'htmlFor',
            'readonly': 'readOnly',
            'maxlength': 'maxLength',
            'cellpadding': 'cellPadding',
            'cellspacing': 'cellSpacing',
            'rowspan': 'rowSpan',
            'colspan': 'colSpan',
            'usemap': 'useMap',
            'frameborder': 'frameBorder'
        };
        return attributeMap[name] || name;
    }

    function normalizeAttributeValue(name, value) {
        // Handle boolean attributes
        const booleanAttributes = ['checked', 'selected', 'disabled', 'readonly', 'multiple', 'draggable'];
        if (booleanAttributes.includes(name)) {
            return value === name || value === 'true' || value === '';
        }
        return value;
    }

    function mergeProps(elementProps, blockProps) {
        const merged = { ...elementProps, ...blockProps };

        // Merge className
        const elementClass = elementProps.className || '';
        const blockClass = blockProps.className || '';
        if (elementClass && blockClass) {
            merged.className = [elementClass, blockClass].filter(Boolean).join(' ');
        } else {
            merged.className = elementClass || blockClass;
        }

        // Merge style objects
        if (elementProps.style || blockProps.style) {
            merged.style = { ...(elementProps.style || {}), ...(blockProps.style || {}) };
        }

        return merged;
    }

    function createAttributesHash(attributes) {
        if (!attributes || typeof attributes !== 'object') return '';
        return Object.keys(attributes)
            .sort()
            .map(key => `${key}:${JSON.stringify(attributes[key])}`)
            .join('|');
    }

    // Expose improved renderer globally for Fanculo blocks
    window.FanculoBlockRenderer = {
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

            const convertDomToReact = (domNode, index = 0) => {
                if (domNode.nodeType === Node.ELEMENT_NODE) {
                    const tagName = domNode.tagName.toLowerCase();

                    // Handle <innerblocks /> tags
                    if (tagName === 'innerblocks') {
                        return createElement(InnerBlocks, {
                            key: `innerblocks-${index}`,
                            allowedBlocks: options.allowedBlocks || null,
                            template: options.template || [],
                            templateLock: options.templateLock || false
                        });
                    }

                    // Handle <div class="fanculo-block-inserter"> elements
                    if (tagName === 'div' && domNode.classList && domNode.classList.contains('fanculo-block-inserter')) {
                        return createElement(InnerBlocks, {
                            key: `innerblocks-inserter-${index}`,
                            allowedBlocks: options.allowedBlocks || null,
                            template: options.template || [],
                            templateLock: options.templateLock || false
                        });
                    }

                    const children = [];
                    domNode.childNodes.forEach((child, childIndex) => {
                        const element = convertDomToReact(child, index * 100 + childIndex);
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
                            if (attr.value) {
                                attr.value.split(';').forEach(stylePair => {
                                    const parts = stylePair.split(':');
                                    if (parts.length === 2) {
                                        const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                                        styleObject[key] = parts[1].trim();
                                    }
                                });
                            }
                            props.style = styleObject;
                        } else {
                            const normalizedName = normalizeAttributeName(attr.name);
                            const normalizedValue = normalizeAttributeValue(attr.name, attr.value);
                            props[normalizedName] = normalizedValue;
                        }
                    }

                    return createElement(tagName, props, ...children);
                } else if (domNode.nodeType === Node.TEXT_NODE) {
                    return domNode.textContent;
                }
                return null;
            };

            const elements = [];
            container.childNodes.forEach((node, nodeIndex) => {
                const element = convertDomToReact(node, nodeIndex);
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
                // If single root element, clone it and merge blockProps
                const element = parsedElements[0];
                if (isValidElement(element)) {
                    const mergedProps = mergeProps(element.props || {}, blockProps);
                    return cloneElement(element, mergedProps);
                } else {
                    // Text node or other non-element, wrap in div
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
            const { useState, useEffect, useMemo } = wp.element;
            const { useBlockProps } = wp.blockEditor;
            const { Spinner } = wp.components;

            return function ServerRenderComponent(props) {
                const { attributes } = props;
                const [serverContent, setServerContent] = useState("");
                const [isLoading, setIsLoading] = useState(true);

                const attributesHash = useMemo(() => createAttributesHash(attributes), [attributes]);

                useEffect(() => {
                    const postId = wp.data.select("core/editor").getCurrentPostId() || 0;

                    wp.apiFetch({
                        path: `/wp/v2/block-renderer/${blockName}?context=edit`,
                        method: "POST",
                        data: {
                            attributes: attributes,
                            post_id: postId
                        }
                    }).then(response => {
                        setServerContent(response.rendered);
                        setIsLoading(false);
                    }).catch(error => {
                        console.error(`Block render error for ${blockName}:`, error);
                        setServerContent("<div><!-- Block render error --></div>");
                        setIsLoading(false);
                    });
                }, [attributesHash]);

                const blockProps = useBlockProps();

                // Render content directly without broken memo
                let renderedContent = null;
                if (!isLoading) {
                    renderedContent = window.FanculoBlockRenderer.renderServerContent(
                        serverContent,
                        blockProps,
                        parserOptions
                    );
                }

                if (isLoading) {
                    return createElement("div", blockProps,
                        createElement(Spinner)
                    );
                }

                return renderedContent;
            };
        }
    };

})();