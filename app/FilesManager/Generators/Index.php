<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        $content = '(function () {' . "\n" .
            '    const { registerBlockType } = wp.blocks;' . "\n" .
            '    const { useBlockProps, InnerBlocks } = wp.blockEditor;' . "\n" .
            '    const { useState, useEffect, useMemo } = wp.element;' . "\n" .
            '    const { Spinner } = wp.components;' . "\n" .
            "\n" .
            '    // InnerBlocks options for NativeBlocksParser' . "\n" .
            '    const PARSER_OPTIONS = {' . "\n" .
            '        allowedBlocks: [' . "\n" .
            '            \'core/paragraph\',' . "\n" .
            '            \'core/heading\',' . "\n" .
            '            \'core/image\',' . "\n" .
            '            \'core/button\',' . "\n" .
            '            \'core/group\',' . "\n" .
            '            \'core/columns\',' . "\n" .
            '            \'core/column\'' . "\n" .
            '        ],' . "\n" .
            '        template: [' . "\n" .
            '            [\'core/paragraph\', { placeholder: \'Add some content here...\' }]' . "\n" .
            '        ],' . "\n" .
            '        templateLock: false' . "\n" .
            '    };' . "\n" .
            "\n" .
            '    const Edit = function(props) {' . "\n" .
            '        const { attributes } = props;' . "\n" .
            '        const [serverContent, setServerContent] = useState(\'\');' . "\n" .
            '        const [isLoading, setIsLoading] = useState(true);' . "\n" .
            "\n" .
            '        useEffect(() => {' . "\n" .
            '            const postId = wp.data.select(\'core/editor\').getCurrentPostId() || 0;' . "\n" .
            "\n" .
            '            wp.apiFetch({' . "\n" .
            '                path: \'/wp/v2/block-renderer/fanculo/BLOCK_SLUG_PLACEHOLDER?context=edit\',' . "\n" .
            '                method: \'POST\',' . "\n" .
            '                data: {' . "\n" .
            '                    attributes: attributes,' . "\n" .
            '                    post_id: postId' . "\n" .
            '                }' . "\n" .
            '            }).then(response => {' . "\n" .
            '                setServerContent(response.rendered);' . "\n" .
            '                setIsLoading(false);' . "\n" .
            '            }).catch(error => {' . "\n" .
            '                console.error(\'Block render error:\', error);' . "\n" .
            '                setServerContent(\'<div><!-- Block render error --></div>\');' . "\n" .
            '                setIsLoading(false);' . "\n" .
            '            });' . "\n" .
            '        }, []);' . "\n" .
            "\n" .
            '        const blockProps = useBlockProps();' . "\n" .
            "\n" .
            '        // Memoize the parser call to prevent unnecessary re-renders' . "\n" .
            '        const renderedContent = useMemo(() => {' . "\n" .
            '            if (isLoading) return null;' . "\n" .
            "\n" .
            '            // Use FanculoInnerBlocksParser if available to handle InnerBlocks inserters' . "\n" .
            '            if (window.FanculoInnerBlocksParser && window.FanculoInnerBlocksParser.createServerContentRenderer) {' . "\n" .
            '                return window.FanculoInnerBlocksParser.createServerContentRenderer(serverContent, blockProps, PARSER_OPTIONS);' . "\n" .
            '            }' . "\n" .
            "\n" .
            '            // Fallback if parser is not loaded' . "\n" .
            '            return wp.element.createElement(\'div\', Object.assign({}, blockProps, {' . "\n" .
            '                dangerouslySetInnerHTML: { __html: serverContent }' . "\n" .
            '            }));' . "\n" .
            '        }, [serverContent, blockProps, isLoading]);' . "\n" .
            "\n" .
            '        if (isLoading) {' . "\n" .
            '            return wp.element.createElement(\'div\', blockProps, ' . "\n" .
            '                wp.element.createElement(Spinner)' . "\n" .
            '            );' . "\n" .
            '        }' . "\n" .
            "\n" .
            '        return renderedContent;' . "\n" .
            '    };' . "\n" .
            "\n" .
            '    registerBlockType(\'fanculo/BLOCK_SLUG_PLACEHOLDER\', {' . "\n" .
            '        edit: Edit,' . "\n" .
            '        save: function() {' . "\n" .
            '            return wp.element.createElement(InnerBlocks.Content);' . "\n" .
            '        }' . "\n" .
            '    });' . "\n" .
            '})();';

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        $result = file_put_contents($indexJsPath, $content);

        return $result !== false;
    }
}