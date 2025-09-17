<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        $content = <<<'JS'
(function () {
    const { registerBlockType } = wp.blocks;
    const { useBlockProps, useInnerBlocksProps, InspectorControls, InnerBlocks } = wp.blockEditor;
    const { useEffect } = wp.element;
    const {
        PanelBody,
        Spinner
    } = wp.components;

    /**
     * Parse HTML content and replace InnerBlocks tags with React components
     */
    function parseHTMLWithInnerBlocks(htmlContent, blockProps) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return wp.element.createElement('div', blockProps, 'No content');
        }

        // Check if HTML contains any InnerBlocks tags (case-insensitive)
        const innerBlocksPattern = /<innerblocks\s*(?:[^>]*?)?\s*\/?>/gi;
        const hasInnerBlocks = innerBlocksPattern.test(htmlContent);

        console.log('HTML content:', htmlContent);
        console.log('Has InnerBlocks:', hasInnerBlocks);

        if (!hasInnerBlocks) {
            // No InnerBlocks - use simple dangerouslySetInnerHTML approach
            return wp.element.createElement('div', {
                ...blockProps,
                dangerouslySetInnerHTML: { __html: htmlContent }
            });
        }

        // Parse HTML with InnerBlocks replacement
        const segments = [];
        let lastIndex = 0;
        let match;

        // Reset regex for global matching
        innerBlocksPattern.lastIndex = 0;

        while ((match = innerBlocksPattern.exec(htmlContent)) !== null) {
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

        console.log('Parsed segments:', segments);

        // Convert segments to React elements
        const elements = segments.map((segment, index) => {
            if (segment.type === 'innerblocks') {
                return wp.element.createElement(InnerBlocks, {
                    key: `innerblocks-${index}`
                });
            } else {
                return wp.element.createElement('span', {
                    key: `html-${index}`,
                    dangerouslySetInnerHTML: { __html: segment.content }
                });
            }
        });

        // If we have multiple segments, wrap in container with blockProps
        if (elements.length > 1) {
            return wp.element.createElement('div', blockProps, ...elements);
        } else if (elements.length === 1) {
            // Single element - try to apply blockProps to it if possible
            const element = elements[0];
            if (element.type === 'div') {
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
                // Parse content and handle InnerBlocks replacement
                blockContentToRender = parseHTMLWithInnerBlocks(staticContent, blockProps);
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
            return wp.element.createElement(wp.element.Fragment);
        }
    });
})();
JS;

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        $result = file_put_contents($indexJsPath, $content);

        if ($result !== false) {
            error_log("Index: Successfully created index.js in $blockDir");
        } else {
            error_log("Index: Failed to create index.js in $blockDir");
        }

        return $result !== false;
    }
}