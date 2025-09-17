<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug, array $settings = []): bool
    {
        $indexJsPath = $blockDir . '/index.js';
        $hasInnerBlocks = self::supportsInnerBlocks($settings);

        $content = <<<'JS'
(function () {
    const { registerBlockType } = wp.blocks;
    const { useBlockProps, useInnerBlocksProps, InspectorControls, InnerBlocks } = wp.blockEditor;
    const { useEffect } = wp.element;
    const {
        PanelBody,
        Spinner
    } = wp.components;

    registerBlockType('fanculo/BLOCK_SLUG_PLACEHOLDER', {
        edit: function (props) {
            const blockProps = useBlockProps();
            const { attributes, setAttributes } = props;
            const [staticContent, setStaticContent] = wp.element.useState('');
            const [isStaticLoading, setIsStaticLoading] = wp.element.useState(true);
            const [debouncedAttributes, setDebouncedAttributes] = wp.element.useState(attributes);

            // Performance optimization - cache responses
            const [staticCache] = wp.element.useState(new Map());

            // Get block metadata from WordPress (loaded from block.json)
            const blockType = wp.blocks.getBlockType('fanculo/BLOCK_SLUG_PLACEHOLDER');
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

            // Debounce attributes changes to avoid excessive API calls
            wp.element.useEffect(() => {
                const timeoutId = setTimeout(() => {
                    setDebouncedAttributes(attributes);
                }, 300);
                return () => clearTimeout(timeoutId);
            }, [attributes]);

            // Load content with current attributes
            wp.element.useEffect(() => {
                const postId = wp.data.select('core/editor').getCurrentPostId() || 0;
                const cacheKey = `content-${postId}-${JSON.stringify(debouncedAttributes)}`;

                // Check cache first
                if (staticCache.has(cacheKey)) {
                    setStaticContent(staticCache.get(cacheKey));
                    setIsStaticLoading(false);
                    return;
                }

                setIsStaticLoading(true);

                // Fetch content with current attributes
                wp.apiFetch({
                    path: '/wp/v2/block-renderer/fanculo/BLOCK_SLUG_PLACEHOLDER?context=edit',
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
                    console.error('Block render error:', error);
                    setStaticContent('<div><!-- Block render error --></div>');
                    setIsStaticLoading(false);
                });
            }, [debouncedAttributes]);

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
                // Check for <InnerBlocks /> tag from PHP processing
                if (staticContent.includes('<InnerBlocks')) {
                    // Replace <InnerBlocks /> with a placeholder for DOM parsing
                    const processedContent = staticContent.replace(/<InnerBlocks\s*\/?>|<InnerBlocks><\/InnerBlocks>/gi, '<innerblocks-placeholder></innerblocks-placeholder>');

                    // Create temporary div to parse HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = processedContent;

                    // Function to convert DOM nodes to React elements
                    const domToReact = (node, index = 0) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent.trim();
                            return text ? text : null;
                        }

                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const tagName = node.tagName.toLowerCase();

                            // Check if this is our InnerBlocks placeholder
                            if (tagName === 'innerblocks-placeholder') {
                                return wp.element.createElement(InnerBlocks, { key: `innerblocks-${index}` });
                            }

                            // Convert attributes
                            const props = { key: `element-${tagName}-${index}` };
                            for (let i = 0; i < node.attributes.length; i++) {
                                const attr = node.attributes[i];
                                let propName = attr.name;

                                // Convert HTML attributes to React props
                                if (propName === 'class') propName = 'className';
                                if (propName === 'for') propName = 'htmlFor';
                                props[propName] = attr.value;
                            }

                            // Convert child nodes
                            const children = [];
                            for (let i = 0; i < node.childNodes.length; i++) {
                                const child = domToReact(node.childNodes[i], `${index}-${i}`);
                                if (child !== null && child !== undefined) {
                                    children.push(child);
                                }
                            }

                            return wp.element.createElement(tagName, props, children.length > 0 ? children : null);
                        }

                        return null;
                    };

                    // Convert all child nodes
                    const elements = [];
                    for (let i = 0; i < tempDiv.childNodes.length; i++) {
                        const element = domToReact(tempDiv.childNodes[i], i);
                        if (element !== null && element !== undefined) {
                            elements.push(element);
                        }
                    }

                    blockContentToRender = wp.element.createElement('div', blockProps, ...elements);
                } else {
                    // Regular content without InnerBlocks
                    blockContentToRender = wp.element.createElement('div', {
                        ...blockProps,
                        dangerouslySetInnerHTML: { __html: staticContent }
                    });
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
            SAVE_FUNCTION_PLACEHOLDER
        }
    });
})();
JS;

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        // Replace save function based on InnerBlocks detection
        if ($hasInnerBlocks) {
            $saveFunction = 'return wp.element.createElement(InnerBlocks.Content);';
        } else {
            $saveFunction = 'return wp.element.createElement(wp.element.Fragment);';
        }
        $content = str_replace('SAVE_FUNCTION_PLACEHOLDER', $saveFunction, $content);

        $result = file_put_contents($indexJsPath, $content);

        if ($result !== false) {
            error_log("Index: Successfully created index.js in $blockDir");
        } else {
            error_log("Index: Failed to create index.js in $blockDir");
        }

        return $result !== false;
    }

    private static function supportsInnerBlocks(array $settings): bool
    {
        return !empty($settings['supportsInnerBlocks']);
    }
}