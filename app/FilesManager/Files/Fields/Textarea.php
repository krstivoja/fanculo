<?php
namespace FanCoolo\FilesManager\Files\Fields;

class Textarea {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $placeholder = esc_js($attr['placeholder'] ?? 'Enter text...');
        $id = esc_js($attr['id'] ?? $name);
        $rows = isset($attr['rows']) ? intval($attr['rows']) : 4;

        $script = <<<EOT
wp.element.createElement(TextareaControl, {
    key: '{$id}',
    value: attributes['{$name}'] || '',
    onChange: (value) => setAttributes({ ['{$name}']: value }),
    label: '{$label}',
    placeholder: '{$placeholder}',
    rows: {$rows},
    __nextHasNoMarginBottom: true
})
EOT;

        return $script;
    }
}
?>