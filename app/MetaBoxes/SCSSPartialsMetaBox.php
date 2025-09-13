<?php

namespace Fanculo\MetaBoxes;

class SCSSPartialsMetaBox extends AbstractMetaBox
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
        // Check if this post is assigned to scss-partials taxonomy
        $terms = wp_get_post_terms($post->ID, 'funculo_type');
        $hasScssPartialsTerm = false;

        foreach ($terms as $term) {
            if ($term->slug === 'scss-partials') {
                $hasScssPartialsTerm = true;
                break;
            }
        }

        if (!$hasScssPartialsTerm) {
            return; // Don't show this metabox
        }

        $this->renderNonce();

        // Get current values
        $scssCode = $this->getMetaValue($post->ID, '_funculo_scss_partial_scss');

        ?>
        <div class="funculo-metabox-container">
            <table class="form-table" role="presentation">
                <tbody>
                    <?php
                    $this->renderCodeField(
                        '_funculo_scss_partial_scss',
                        'SCSS Code',
                        $scssCode,
                        'scss'
                    );
                    ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    protected function saveFields($postId)
    {
        $fields = [
            '_funculo_scss_partial_scss'
        ];

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                $value = sanitize_textarea_field($_POST[$field]);
                $this->saveMetaValue($postId, $field, $value);
            }
        }
    }
}