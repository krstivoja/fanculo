<?php
namespace Fanculo\FilesManager\Files\Fields;

class Range {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);
        $min = isset($attr['min']) ? floatval($attr['min']) : 0;
        $max = isset($attr['max']) ? floatval($attr['max']) : 100;
        $step = isset($attr['step']) ? floatval($attr['step']) : 1;

        $script = <<<EOT
wp.element.createElement(RangeControl, {
    key: '{$id}',
    label: '{$label}',
    value: attributes['{$name}'] ?? {$min},
    onChange: (value) => setAttributes({ ['{$name}']: parseFloat(value) || {$min} }),
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