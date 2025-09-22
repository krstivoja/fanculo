<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Range {
    public static function generate($attr) {
        // Get range settings from the range object or use defaults
        $range = isset($attr['range']) ? $attr['range'] : [];
        $min = 0; // Always start from 0
        $max = isset($range['max']) ? $range['max'] : (isset($attr['max']) ? $attr['max'] : 100);
        $step = 1; // Default step value
        $script = <<<EOT

    wp.element.createElement(wp.components.RangeControl, {
       key: 'range-control-{$attr['name']}',
       value: typeof attributes['{$attr['name']}'] === 'number' ? attributes['{$attr['name']}'] : Number({$min}),
        onChange: (value) => setAttributes({ ['{$attr['name']}']: value }),
        min: {$min},
        max: {$max},
        step: {$step}
    })
EOT;

        return $script;
    }
}
?>