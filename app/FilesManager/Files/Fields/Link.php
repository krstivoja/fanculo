<?php
namespace Fanculo\FilesManager\Files\Fields;

class Link {
    public static function generate($attr) {
        $name = esc_js($attr['name'] ?? '');
        $label = esc_js($attr['label'] ?? '');
        $id = esc_js($attr['id'] ?? $name);

        $script = <<<EOT
wp.element.createElement('div', { key: '{$id}' },
    wp.element.createElement(InputControl, {
        key: '{$id}-url',
        label: '{$label} URL',
        value: attributes['{$name}']?.url || '',
        onChange: (value) => setAttributes({
            ['{$name}']: {
                ...attributes['{$name}'],
                url: value
            }
        }),
        placeholder: 'Enter URL',
        __next40pxDefaultSize: true
    }),
    wp.element.createElement(InputControl, {
        key: '{$id}-text',
        label: '{$label} Text',
        value: attributes['{$name}']?.text || '',
        onChange: (value) => setAttributes({
            ['{$name}']: {
                ...attributes['{$name}'],
                text: value
            }
        }),
        placeholder: 'Link text',
        __next40pxDefaultSize: true
    }),
    wp.element.createElement(SelectControl, {
        key: '{$id}-target',
        label: '{$label} Target',
        value: attributes['{$name}']?.target || '_self',
        onChange: (value) => setAttributes({
            ['{$name}']: {
                ...attributes['{$name}'],
                target: value
            }
        }),
        options: [
            { label: 'Same window (_self)', value: '_self' },
            { label: 'New window (_blank)', value: '_blank' },
            { label: 'Parent frame (_parent)', value: '_parent' },
            { label: 'Top frame (_top)', value: '_top' }
        ],
        __nextHasNoMarginBottom: true
    })
)
EOT;

        return $script;
    }
}
?>