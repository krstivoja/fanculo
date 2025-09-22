<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Date {
    public static function generate($attr) {
        $script = <<<EOT
wp.element.createElement(wp.components.DatePicker, {
    key: '{$attr['id']}',
    date: attributes['{$attr['name']}'] || '',
    onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
    label: '{$attr['label']}'
})
EOT;

        return $script;
    }
}
?>