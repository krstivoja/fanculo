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

        // Add nonce for security
        $this->renderNonce();

        // React container - React will handle the forms
        echo '<div id="scss-partials-metabox-react" data-post-id="' . esc_attr($post->ID) . '" data-type="scss-partials"></div>';
    }

    protected function saveFields($postId)
    {
        $fields = [
            '_funculo_scss_partial_scss'
        ];

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                $value = sanitize_textarea_field(wp_unslash($_POST[$field]));
                $this->saveMetaValue($postId, $field, $value);
            }
        }
    }
}