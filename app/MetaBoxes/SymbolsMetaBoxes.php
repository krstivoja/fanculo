<?php

namespace Fanculo\MetaBoxes;

class SymbolsMetaBoxes extends AbstractMetaBox
{
    public function __construct()
    {
        $this->metaBoxId = 'funculo_symbols_metabox';
        $this->title = 'Symbol Components';
        $this->context = 'normal';
        $this->priority = 'high';

        parent::__construct();
    }

    public function renderMetaBox($post)
    {
        $this->renderNonce();

        // Get current values
        $phpCode = $this->getMetaValue($post->ID, '_funculo_symbol_php');

        ?>
        <div class="funculo-metabox-container">
            <table class="form-table" role="presentation">
                <tbody>
                    <?php
                    $this->renderCodeField(
                        '_funculo_symbol_php',
                        'PHP Code',
                        $phpCode,
                        'php'
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
            .funculo-code-editor {
                font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
                font-size: 13px;
                line-height: 1.4;
            }
        </style>
        <?php
    }

    protected function saveFields($postId)
    {
        if (isset($_POST['_funculo_symbol_php'])) {
            $value = sanitize_textarea_field($_POST['_funculo_symbol_php']);
            $this->saveMetaValue($postId, '_funculo_symbol_php', $value);
        }
    }
}