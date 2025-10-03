<?php
namespace FanCoolo\FilesManager\Files\Fields;

class Checkbox {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);

        $script = <<<EOT
wp.element.createElement(CheckboxControl, {
    key: '{$id}',
    checked: attributes['{$name}'] || false,
    onChange: (value) => setAttributes({ ['{$name}']: value }),
    label: '{$label}',
    __nextHasNoMarginBottom: true
})
EOT;

        return $script;
    }
}
?>