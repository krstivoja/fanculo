<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Number {
    public static function generate($attr) {
        $script = <<<EOT
wp.element.createElement(wp.components.__experimentalInputControl, {
    key: '{$attr['id']}',
    value: typeof attributes['{$attr['name']}'] === 'number' ? attributes['{$attr['name']}'] : 0,
    onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
    label: '{$attr['label']}',
    type: 'number',
    __next40pxDefaultSize: true
})
EOT;

        return $script;
    }
}
?>