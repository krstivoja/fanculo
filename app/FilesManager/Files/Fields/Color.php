<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Color {
    public static function generate($attr) {
        $script = <<<EOT
            wp.element.createElement(wp.components.ColorPalette, {
            key: '{$attr['id']}',
            value: attributes['{$attr['name']}'] || '#000000',
            onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
            colors: wp.data.select('core/block-editor').getSettings().colors
            })
            EOT;
        return $script;
    }
}
?>