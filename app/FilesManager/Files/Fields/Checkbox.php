<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Checkbox {
    public static function generate($attr) {
        $script = <<<EOT

    wp.element.createElement(wp.components.CheckboxControl, {
        checked: attributes['{$attr['name']}'] || false,
        onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
        label: '{$attr['label']}'
    })
EOT;

        return $script;
    }
}
?>