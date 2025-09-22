<?php
namespace Fanculo\FilesManager\Files\Fields;

class Toggle {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);

        $script = <<<EOT
wp.element.createElement(ToggleControl, {
    key: '{$id}',
    checked: attributes['{$name}'] || false,
    onChange: (value) => setAttributes({ ['{$name}']: value }),
    label: '{$label}'
})
EOT;

        return $script;
    }
}
?>