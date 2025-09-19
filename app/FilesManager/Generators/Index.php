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
    const { useBlockProps, InnerBlocks } = wp.blockEditor;
    const { useState, useEffect, useMemo } = wp.element;
    const { Spinner } = wp.components;

    // InnerBlocks options for NativeBlocksParser
    const PARSER_OPTIONS = {
        allowedBlocks: [
            'core/paragraph',
            'core/heading',
            'core/image',
            'core/button',
            'core/group',
            'core/columns',
            'core/column'
        ],
        template: [
            ['core/paragraph', { placeholder: 'Add some content here...' }]
        ],
        templateLock: false
    };

    const Edit = function(props) {
        const { attributes } = props;
        const [serverContent, setServerContent] = useState('');
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            const postId = wp.data.select('core/editor').getCurrentPostId() || 0;

            wp.apiFetch({
                path: '/wp/v2/block-renderer/fanculo/BLOCK_SLUG_PLACEHOLDER?context=edit',
                method: 'POST',
                data: {
                    attributes: attributes,
                    post_id: postId
                }
            }).then(response => {
                setServerContent(response.rendered);
                setIsLoading(false);
            }).catch(error => {
                console.error('Block render error:', error);
                setServerContent('<div><!-- Block render error --></div>');
                setIsLoading(false);
            });
        }, []);

        const blockProps = useBlockProps();

        // Memoize the parser call to prevent unnecessary re-renders
        const renderedContent = useMemo(() => {
            if (isLoading) return null;

            // Use FanculoInnerBlocksParser if available to handle InnerBlocks inserters
            if (window.FanculoInnerBlocksParser && window.FanculoInnerBlocksParser.createServerContentRenderer) {
                return window.FanculoInnerBlocksParser.createServerContentRenderer(serverContent, blockProps, PARSER_OPTIONS);
            }

            // Fallback if parser is not loaded
            return wp.element.createElement('div', Object.assign({}, blockProps, {
                dangerouslySetInnerHTML: { __html: serverContent }
            }));
        }, [serverContent, blockProps, isLoading]);

        if (isLoading) {
            return wp.element.createElement('div', blockProps, 
                wp.element.createElement(Spinner)
            );
        }

        return renderedContent;
    };

    registerBlockType('fanculo/BLOCK_SLUG_PLACEHOLDER', {
        edit: Edit,
        save: function() {
            return wp.element.createElement(InnerBlocks.Content);
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