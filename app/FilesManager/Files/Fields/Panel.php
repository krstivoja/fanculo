<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

use GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components\Input;

class Panel {
    public static function generate($blockAttributes, $attributes, $setAttributes) {
        // Only render panel if we have attributes
        if (empty($blockAttributes)) {
            return '';
        }

        $attributes_js = json_encode($blockAttributes);
        
        // Generate input script for each attribute
        $input_script = Input::generate('attr', $attributes, $setAttributes);
        
        return <<<EOT
(function () {
    const { InspectorControls } = wp.blockEditor;
    const { PanelBody } = wp.components;

    const blockAttributes = {$attributes_js};

    return wp.element.createElement(
        InspectorControls,
        null,
        wp.element.createElement(
            PanelBody,
            { 
                title: 'Block Settings',
                initialOpen: true
            },
            blockAttributes.map(attr => {
                return {$input_script};
            })
        )
    );
})();
EOT;
    }
} 