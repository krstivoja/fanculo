/**
 * Fanculo Block Renderer
 * Properly renders server-side content without adding extra wrapper divs
 */

(function() {
    'use strict';

    // Use WordPress globals
    const { createElement, cloneElement } = wp.element;
    const { InnerBlocks } = wp.blockEditor;

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

            const convertDomToReact = (domNode) => {
                if (domNode.nodeType === Node.ELEMENT_NODE) {
                    const tagName = domNode.tagName.toLowerCase();

                    // Handle <innerblocks /> tags
                    if (tagName === 'innerblocks') {
                        return createElement(InnerBlocks, {
                            key: 'innerblocks',
                            allowedBlocks: options.allowedBlocks || null,
                            template: options.template || [],
                            templateLock: options.templateLock || false
                        });
                    }

                    // Handle <div class="fanculo-block-inserter"> elements
                    if (tagName === 'div' && domNode.classList && domNode.classList.contains('fanculo-block-inserter')) {
                        return createElement(InnerBlocks, {
                            key: 'innerblocks',
                            allowedBlocks: options.allowedBlocks || null,
                            template: options.template || [],
                            templateLock: options.templateLock || false
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
                // If single root element, clone it and merge blockProps
                return cloneElement(parsedElements[0], blockProps);
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
                }, [JSON.stringify(attributes)]);

                const blockProps = useBlockProps();

                const renderedContent = useMemo(() => {
                    if (isLoading) return null;

                    return window.FanculoBlockRenderer.renderServerContent(
                        serverContent,
                        blockProps,
                        parserOptions
                    );
                }, [serverContent, blockProps, isLoading]);

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