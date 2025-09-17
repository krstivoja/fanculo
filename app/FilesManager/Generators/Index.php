<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        $content = <<<'JS'
(function () {
    /**
     * Pre-Loaded Block - Zero Server Calls
     * Content pre-rendered before Gutenberg loads = instant rendering
     * No API calls, no loading states, no delays
     */
    const { registerBlockType } = wp.blocks;
    const { useBlockProps, InspectorControls, InnerBlocks } = wp.blockEditor;
    const { useEffect, useState } = wp.element;
    const {
        PanelBody,
        __experimentalInputControl: InputControl,
        __experimentalNumberControl: NumberControl,
        SelectControl,
        RangeControl,
        TextareaControl,
        CheckboxControl
    } = wp.components;

    /**
     * Instant renderer using pre-loaded data
     */
    function InstantRenderer({ attributes, blockProps }) {
        const [content, setContent] = useState('');
        const [renderMode, setRenderMode] = useState('loading');

        useEffect(() => {
            loadFromPreloadedData();
        }, [attributes]);

        function loadFromPreloadedData() {
            // Check for pre-loaded data (available immediately)
            if (window.FunculoPreloadedData && window.FunculoPreloadedData.blocks) {
                const blockData = window.FunculoPreloadedData.blocks['fanculo/BLOCK_SLUG_PLACEHOLDER'];

                if (blockData) {
                    // Try to find exact match
                    const exactKey = generateCacheKey(attributes);
                    if (blockData[exactKey]) {
                        console.log('⚡ INSTANT: Exact pre-loaded match (0ms)');
                        setContent(blockData[exactKey]);
                        setRenderMode('preloaded');
                        return;
                    }

                    // Try default variation
                    if (blockData['default']) {
                        console.log('🚀 INSTANT: Default pre-loaded (0ms)');
                        setContent(blockData['default']);
                        setRenderMode('preloaded');
                        return;
                    }

                    // Use any available variation
                    const firstAvailable = Object.values(blockData)[0];
                    if (firstAvailable) {
                        console.log('✨ INSTANT: Fallback pre-loaded (0ms)');
                        setContent(firstAvailable);
                        setRenderMode('preloaded');
                        return;
                    }
                }
            }

            // Fallback: Client-side rendering (still instant)
            console.log('💻 INSTANT: Client-side fallback');
            setRenderMode('client');
        }

        function generateCacheKey(attrs) {
            // Match server-side key generation
            const cleanAttrs = {};
            Object.keys(attrs).forEach(key => {
                if (attrs[key] !== undefined && attrs[key] !== null) {
                    cleanAttrs[key] = attrs[key];
                }
            });

            if (Object.keys(cleanAttrs).length === 0) {
                return 'default';
            }

            return Object.entries(cleanAttrs)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}_${v}`)
                .join('_');
        }

        if (renderMode === 'client') {
            // Client-side fallback - still instant
            return wp.element.createElement('div', blockProps,
                wp.element.createElement('div', {
                    style: {
                        padding: '20px',
                        backgroundColor: attributes.backgroundColor || '#f8f9fa',
                        borderRadius: '8px',
                        color: attributes.textColor || '#333',
                        border: '1px solid #e0e0e0',
                        position: 'relative'
                    }
                },
                    wp.element.createElement('div', {
                        style: {
                            position: 'absolute',
                            top: '5px',
                            right: '10px',
                            fontSize: '10px',
                            color: '#666',
                            opacity: 0.7
                        }
                    }, 'CLIENT'),

                    wp.element.createElement('h2', {
                        style: {
                            fontSize: (attributes.fontSize || 24) + 'px',
                            marginBottom: '16px',
                            color: attributes.textColor || '#333'
                        }
                    }, attributes.title || 'Block Title'),

                    attributes.content && wp.element.createElement('p', {
                        style: { marginBottom: '16px' }
                    }, attributes.content),

                    wp.element.createElement(InnerBlocks, {
                        allowedBlocks: ['core/paragraph', 'core/heading', 'core/list'],
                        template: [['core/paragraph', { placeholder: 'Add content...' }]]
                    })
                )
            );
        }

        // Pre-loaded server content (0ms rendering)
        return wp.element.createElement('div', {
            ...blockProps,
            dangerouslySetInnerHTML: { __html: content },
            'data-render-mode': 'preloaded'
        });
    }

    /**
     * Auto-generated inspector controls
     */
    function AutoInspectorControls({ attributes, setAttributes, blockAttributes }) {
        const editableKeys = Object.keys(blockAttributes).filter(key =>
            !['innerContent', 'content', 'className', 'customClassName', 'lock', 'metadata', 'blockCommentId'].includes(key)
        );

        if (editableKeys.length === 0) return null;

        const controls = editableKeys.map(attrKey => {
            const config = blockAttributes[attrKey];
            const value = attributes[attrKey];

            const handleChange = (newValue) => setAttributes({ [attrKey]: newValue });

            switch (config.type) {
                case 'string':
                    if (config.enum) {
                        return wp.element.createElement(SelectControl, {
                            key: attrKey,
                            label: config.label || attrKey,
                            value: value || config.default || '',
                            options: config.enum.map(opt => ({ label: opt, value: opt })),
                            onChange: handleChange
                        });
                    }
                    return wp.element.createElement(InputControl, {
                        key: attrKey,
                        label: config.label || attrKey,
                        value: value || config.default || '',
                        onChange: handleChange
                    });

                case 'number':
                    return wp.element.createElement(RangeControl, {
                        key: attrKey,
                        label: config.label || attrKey,
                        value: value || config.default || 0,
                        min: config.minimum || 0,
                        max: config.maximum || 100,
                        onChange: handleChange
                    });

                case 'boolean':
                    return wp.element.createElement(CheckboxControl, {
                        key: attrKey,
                        label: config.label || attrKey,
                        checked: value !== undefined ? !!value : !!config.default,
                        onChange: handleChange
                    });

                default:
                    return wp.element.createElement(TextareaControl, {
                        key: attrKey,
                        label: config.label || attrKey,
                        value: value || config.default || '',
                        rows: 3,
                        onChange: handleChange
                    });
            }
        });

        return wp.element.createElement(PanelBody, {
            title: 'Block Settings',
            initialOpen: true
        }, controls);
    }

    registerBlockType('fanculo/BLOCK_SLUG_PLACEHOLDER', {
        edit: function (props) {
            const blockProps = useBlockProps();
            const { attributes, setAttributes } = props;

            // Get block metadata
            const blockType = wp.blocks.getBlockType('fanculo/BLOCK_SLUG_PLACEHOLDER');
            const blockAttributes = blockType?.attributes || {};

            // Initialize defaults once
            useEffect(() => {
                const updates = {};
                Object.keys(blockAttributes).forEach(attrKey => {
                    const config = blockAttributes[attrKey];
                    if (attributes[attrKey] === undefined && config.default !== undefined) {
                        updates[attrKey] = config.default;
                    }
                });

                if (Object.keys(updates).length > 0) {
                    setAttributes(updates);
                }
            }, []);

            const hasEditableAttributes = Object.keys(blockAttributes).some(key =>
                !['innerContent', 'content', 'className', 'customClassName', 'lock', 'metadata', 'blockCommentId'].includes(key)
            );

            return wp.element.createElement(wp.element.Fragment, null,
                hasEditableAttributes && wp.element.createElement(InspectorControls, { key: 'inspector' },
                    wp.element.createElement(AutoInspectorControls, {
                        attributes: attributes,
                        setAttributes: setAttributes,
                        blockAttributes: blockAttributes
                    })
                ),
                // Instant rendering - no loading states, no delays
                wp.element.createElement(InstantRenderer, {
                    attributes: attributes,
                    blockProps: blockProps
                })
            );
        },
        save: function(props) {
            // Server-side rendering handles frontend
            return null;
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