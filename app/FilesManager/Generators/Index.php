<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        $content = <<<JS
        (function () {
            const { registerBlockType } = wp.blocks;
            const { useBlockProps, InspectorControls, InnerBlocks } = wp.blockEditor;
            const ServerSideRender = wp.serverSideRender;
            const { useEffect, createElement } = wp.element;
            const {
                Panel,
                PanelBody,
                PanelRow,
                __experimentalInputControl: InputControl,
                __experimentalNumberControl: NumberControl,
                DatePicker,
                Button,
                Popover,
                DropZone,
                ColorPalette,
                SelectControl,
                RangeControl,
                TextareaControl,
                CheckboxControl,
                RadioControl,
                Spinner
            } = wp.components;

            registerBlockType('fanculo/{$blockSlug}', {
                edit: function (props) {
                    const blockProps = useBlockProps();
                    const { attributes, setAttributes } = props;
                    const [staticContent, setStaticContent] = wp.element.useState('');
                    const [isStaticLoading, setIsStaticLoading] = wp.element.useState(true);
                    const [debouncedAttributes, setDebouncedAttributes] = wp.element.useState(attributes);

                    // Performance optimizations
                    const [staticCache] = wp.element.useState(new Map());
                    const abortControllerRef = wp.element.useRef(null);

                    // Get block metadata from WordPress (loaded from block.json)
                    const blockType = wp.blocks.getBlockType('fanculo/{$blockSlug}');
                    const blockAttributes = blockType?.attributes || {};

                    // Filter out non-editable attributes (like innerContent, className, etc.)
                    const editableAttributeKeys = Object.keys(blockAttributes).filter(key =>
                        key !== 'innerContent' &&
                        key !== 'content' &&
                        key !== 'className' &&
                        key !== 'customClassName' &&
                        key !== 'lock' &&
                        key !== 'metadata' &&
                        key !== 'blockCommentId'
                    );

                    // Initialize attributes with defaults from block.json
                    Object.keys(blockAttributes).forEach(attrKey => {
                        const attrConfig = blockAttributes[attrKey];
                        if (attributes[attrKey] === undefined && attrConfig.default !== undefined) {
                            setAttributes({ [attrKey]: attrConfig.default });
                        }
                    });

                    const renderPanel = editableAttributeKeys.length > 0;

                    // Debounce attributes changes
                    wp.element.useEffect(() => {
                        const timeoutId = setTimeout(() => {
                            setDebouncedAttributes(attributes);
                        }, 500);

                        return () => clearTimeout(timeoutId);
                    }, [attributes]);

                    // Load content with current attributes
                    wp.element.useEffect(() => {
                        const postId = wp.data.select('core/editor').getCurrentPostId() || 0;
                        const cacheKey = `content-\${postId}-\${JSON.stringify(debouncedAttributes)}`;

                        // Check cache first
                        if (staticCache.has(cacheKey)) {
                            setStaticContent(staticCache.get(cacheKey));
                            setIsStaticLoading(false);
                            return;
                        }

                        setIsStaticLoading(true);

                        // Fetch content with current attributes
                        wp.apiFetch({
                            path: '/wp/v2/block-renderer/fanculo/{$blockSlug}?context=edit',
                            method: 'POST',
                            data: {
                                attributes: debouncedAttributes,
                                post_id: postId
                            }
                        }).then(response => {
                            // Cache content
                            staticCache.set(cacheKey, response.rendered);
                            setStaticContent(response.rendered);
                            setIsStaticLoading(false);
                        }).catch(error => {
                            console.error('Error fetching content:', error);
                            const fallbackContent = `
                                <div></div>
                            `;
                            staticCache.set(cacheKey, fallbackContent);
                            setStaticContent(fallbackContent);
                            setIsStaticLoading(false);
                        });
                    }, [debouncedAttributes]); // Re-run when attributes change

                    // Enhanced HTML parser that adds dynamic content
                    const parseStaticHTMLWithDynamic = (htmlString) => {
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
                    };

                    let blockContentToRender;
                    if (isStaticLoading) {
                        blockContentToRender = wp.element.createElement('div', {
                            key: 'loading',
                            style: {
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '5px',
                                minHeight: '20px'
                            }
                        }, wp.element.createElement(Spinner));
                    } else {
                        const parsedElements = parseStaticHTMLWithDynamic(staticContent);
                        if (parsedElements.length === 1) {
                            // If only one root element, clone it and add blockProps
                            blockContentToRender = wp.element.cloneElement(parsedElements[0], blockProps);
                        } else {
                            // If multiple or no root elements, wrap in a div with blockProps
                            blockContentToRender = wp.element.createElement('div', blockProps, ...parsedElements);
                        }
                    }

                    return wp.element.createElement(wp.element.Fragment, null,
                        renderPanel && wp.element.createElement(InspectorControls, { key: 'inspector' },
                            wp.element.createElement(PanelBody, {
                                title: 'Block Settings',
                                initialOpen: true
                            }, [])
                        ),
                        blockContentToRender
                    );
                },
                save: props => {
                                        return wp.element.createElement('Fragment', {
                        dangerouslySetInnerHTML: { __html: '' }
                    });
                                    }
            });
        })();

JS;

        $result = file_put_contents($indexJsPath, $content);

        if ($result !== false) {
            error_log("Index: Successfully created index.js in $blockDir");
        } else {
            error_log("Index: Failed to create index.js in $blockDir");
        }

        return $result !== false;
    }
}