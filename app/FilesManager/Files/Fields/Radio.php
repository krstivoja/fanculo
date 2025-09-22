<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Radio {
    public static function generate($attr) {
        // Validate attribute keys
        if (!isset($attr['id']) || !isset($attr['name'])) {
            // Radio component error: Missing id or name for attribute
            return 'null';
        }

        // Validate and prepare options
        $options = isset($attr['options']) && is_array($attr['options']) ? $attr['options'] : [];
        $valid_options = array_filter($options, function ($option) {
            return isset($option['label'], $option['value']) && is_string($option['label']) && $option['label'] !== '';
        });

        if (empty($valid_options)) {
                            // Radio component warning: No valid options for attribute
            $valid_options = [['label' => 'No options available', 'value' => '']];
        }

        $options_js = json_encode($valid_options);
        error_log('Radio Component Options for ' . $attr['name'] . ': ' . $options_js);

        $script = <<<EOT
wp.element.createElement(
    'div',
    { 
        key: '{$attr['id']}',
        style: { marginBottom: '16px' }
    },
    wp.element.createElement(
        'div',
        { 
            style: { 
                marginBottom: '8px',
                fontWeight: 'bold'
            }
        },
        '{$attr['name']}'
    ),
    wp.element.createElement(wp.components.RadioControl, {
        selected: attributes['{$attr['name']}'] || '',
        onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
        options: {$options_js}
    })
)
EOT;

        return $script;
    }
}
?>