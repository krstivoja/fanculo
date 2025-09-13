<?php

namespace Fanculo\MetaBoxes;

class SCSSPartialsMetaBoxes extends AbstractMetaBox
{
    public function __construct()
    {
        $this->metaBoxId = 'funculo_scss_partials_metabox';
        $this->title = 'SCSS Partial Components';
        $this->context = 'normal';
        $this->priority = 'high';

        parent::__construct();
    }

    public function renderMetaBox($post)
    {
        $this->renderNonce();

        // Get current values
        $scssCode = $this->getMetaValue($post->ID, '_funculo_scss_partial');

        ?>
        <div class="funculo-metabox-container">
            <table class="form-table" role="presentation">
                <tbody>
                    <?php
                    $this->renderCodeField(
                        '_funculo_scss_partial',
                        'SCSS Code',
                        $scssCode,
                        'scss'
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
        if (isset($_POST['_funculo_scss_partial'])) {
            $value = sanitize_textarea_field($_POST['_funculo_scss_partial']);
            $this->saveMetaValue($postId, '_funculo_scss_partial', $value);
        }
    }
}