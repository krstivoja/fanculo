<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Select {
    public static $exampleOptions = [
        ['label' => 'Option 1', 'value' => 'option1'],
        ['label' => 'Option 2', 'value' => 'option2'],
        ['label' => 'Option 3', 'value' => 'option3']
    ];
    public static function generate($attr) {
        // Ensure options is an array, default to empty if not set
        $options = isset($attr['options']) && is_array($attr['options']) ? json_encode($attr['options']) : '[]';
        $script = <<<EOT

    wp.element.createElement(wp.components.SelectControl, {
        key: '{$attr['id']}',
        value: attributes['{$attr['name']}'] || '',
        onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
        options: {$options},
        label: '{$attr['label']}',
    })
EOT;

        return $script;
    }
}
?>