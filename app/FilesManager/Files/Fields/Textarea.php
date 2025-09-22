<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Textarea {
    public static function generate($attr) {

        $script = <<<EOT
            wp.element.createElement(wp.components.TextareaControl, {
                key: '{$attr['id']}',
                value: attributes['{$attr['name']}'] || '',
                onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
                label: '{$attr['label']}',
                placeholder: 'Enter text...',
                rows: 4
            })
            EOT;

        return $script;
    }
}
?>