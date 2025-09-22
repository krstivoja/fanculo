<?php
namespace Fanculo\FilesManager\Files\Fields;

class Text {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $placeholder = esc_js($attr['placeholder'] ?? '');
        $id = esc_js($attr['id'] ?? $name);

        $script = <<<EOT
wp.element.createElement(InputControl, {
    key: '{$id}',
    value: attributes['{$name}'] || '',
    onChange: (value) => setAttributes({ ['{$name}']: value }),
    label: '{$label}',
    placeholder: '{$placeholder}',
    __next40pxDefaultSize: true
})
EOT;

        return $script;
    }
}
?>