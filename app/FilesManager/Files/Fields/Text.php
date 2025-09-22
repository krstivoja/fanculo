<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Text {
    public static function generate($attr) {
        $script = <<<EOT
wp.element.createElement(InputControl, {
    key: '{$attr['id']}',
    value: attributes['{$attr['name']}'] || '',
    onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
    label: '{$attr['label']}',
    __next40pxDefaultSize: true
})
EOT;

        return $script;
    }
}
?>