<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Link {
    public static function generate($attr) {
        $script = <<<EOT
            wp.element.createElement(wp.blockEditor.URLInput, {
                key: '{$attr['id']}',
                value: attributes['{$attr['name']}']?.url || '',
                onChange: (value) => setAttributes({ ['{$attr['name']}']: { url: value } }),
                placeholder: 'Enter URL',
                __unstableAllowPrefix: true
            })
        EOT;

        return $script;
    }
}
?>