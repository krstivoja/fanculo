<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class RichText {
    public static function generate($attr) {
        $script = <<<EOT

    wp.element.createElement(wp.blockEditor.RichText, {
        tagName: 'p',
        value: attributes['{$attr['name']}'] || '',
        onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
        placeholder: 'Enter text...'
    })
EOT;

        return $script;
    }
}
?>