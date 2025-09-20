<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        $content = '(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;

    // InnerBlocks options
    const PARSER_OPTIONS = {
        allowedBlocks: [
            "core/paragraph",
            "core/heading",
            "core/image",
            "core/button",
            "core/group",
            "core/columns",
            "core/column"
        ],
        template: [
            ["core/paragraph", { placeholder: "Add some content here..." }]
        ],
        templateLock: false
    };

    // Use the shared FanculoBlockRenderer to create the edit component
    const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
        "fanculo/BLOCK_SLUG_PLACEHOLDER",
        PARSER_OPTIONS
    );

    registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
        edit: Edit,
        save: function() {
            return wp.element.createElement(InnerBlocks.Content);
        }
    });
})()';

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        $result = file_put_contents($indexJsPath, $content);

        return $result !== false;
    }
}