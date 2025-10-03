<?php
namespace FanCoolo\FilesManager\Files\Fields;

class Color {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);
        $defaultColor = esc_js($attr['default'] ?? '#000000');

        $script = <<<EOT
wp.element.createElement(ColorPalette, {
    key: '{$id}',
    value: attributes['{$name}'] || '{$defaultColor}',
    onChange: (value) => setAttributes({ ['{$name}']: value }),
    colors: wp.data.select('core/block-editor').getSettings().colors
})
EOT;
        return $script;
    }
}
?>