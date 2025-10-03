<?php
namespace FanCoolo\FilesManager\Files\Fields;

class Number {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);
        $min = isset($attr['min']) ? floatval($attr['min']) : 'undefined';
        $max = isset($attr['max']) ? floatval($attr['max']) : 'undefined';
        $step = isset($attr['step']) ? floatval($attr['step']) : 'undefined';

        $script = <<<EOT
wp.element.createElement(NumberControl, {
    key: '{$id}',
    value: attributes['{$name}'] ?? 0,
    onChange: (value) => setAttributes({ ['{$name}']: parseFloat(value) || 0 }),
    label: '{$label}',
    min: {$min},
    max: {$max},
    step: {$step},
    __nextHasNoMarginBottom: true
})
EOT;

        return $script;
    }
}
?>