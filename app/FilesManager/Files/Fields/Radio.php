<?php
namespace Fanculo\FilesManager\Files\Fields;

class Radio {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);

        // Ensure options is an array, default to empty if not set
        $options = isset($attr['options']) && is_array($attr['options']) ? json_encode($attr['options'], JSON_UNESCAPED_SLASHES) : '[]';

        $script = <<<EOT
wp.element.createElement(RadioControl, {
    key: '{$id}',
    label: '{$label}',
    selected: attributes['{$name}'] || '',
    onChange: (value) => setAttributes({ ['{$name}']: value }),
    options: {$options},
    __nextHasNoMarginBottom: true
})
EOT;

        return $script;
    }
}
?>