<?php

namespace Fanculo\MetaBoxes;

class BlocksMetaBoxes extends AbstractMetaBox
{
    public function __construct()
    {
        $this->metaBoxId = 'funculo_blocks_metabox';
        $this->title = 'Block Components';
        $this->context = 'normal';
        $this->priority = 'high';

        parent::__construct();
    }

    public function renderMetaBox($post)
    {
        $this->renderNonce();

        // Get current values
        $phpCode = $this->getMetaValue($post->ID, '_funculo_block_php');
        $scssCode = $this->getMetaValue($post->ID, '_funculo_block_scss');
        $jsCode = $this->getMetaValue($post->ID, '_funculo_block_js');
        $attributes = $this->getMetaValue($post->ID, '_funculo_block_attributes');
        $settings = $this->getMetaValue($post->ID, '_funculo_block_settings');

        ?>
        <div class="funculo-metabox-container">
            <table class="form-table" role="presentation">
                <tbody>
                    <?php
                    $this->renderCodeField(
                        '_funculo_block_php',
                        'PHP Code',
                        $phpCode,
                        'php'
                    );

                    $this->renderCodeField(
                        '_funculo_block_scss',
                        'SCSS Code',
                        $scssCode,
                        'scss'
                    );

                    $this->renderCodeField(
                        '_funculo_block_js',
                        'JavaScript Code',
                        $jsCode,
                        'javascript'
                    );

                    $this->renderJsonField(
                        '_funculo_block_attributes',
                        'Block Attributes',
                        $attributes,
                        '{"title": {"type": "string", "default": ""}}'
                    );

                    $this->renderJsonField(
                        '_funculo_block_settings',
                        'Block Settings',
                        $settings,
                        '{"category": "common", "icon": "block-default"}'
                    );
                    ?>
                </tbody>
            </table>
        </div>

        <style>
            .funculo-metabox-container .form-table th {
                width: 150px;
                vertical-align: top;
                padding-top: 15px;
            }
            .funculo-code-editor, .funculo-json-editor {
                font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
                font-size: 13px;
                line-height: 1.4;
            }
        </style>
        <?php
    }

    protected function saveFields($postId)
    {
        $fields = [
            '_funculo_block_php',
            '_funculo_block_scss',
            '_funculo_block_js',
            '_funculo_block_attributes',
            '_funculo_block_settings'
        ];

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                $value = sanitize_textarea_field($_POST[$field]);

                // Special handling for JSON fields
                if (in_array($field, ['_funculo_block_attributes', '_funculo_block_settings'])) {
                    $decoded = json_decode($value, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $value = $decoded;
                    } else {
                        // Keep original value if JSON is invalid
                        $value = $this->getMetaValue($postId, $field);
                    }
                }

                $this->saveMetaValue($postId, $field, $value);
            }
        }
    }
}