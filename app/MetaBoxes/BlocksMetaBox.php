<?php

namespace Fanculo\MetaBoxes;

class BlocksMetaBox extends AbstractMetaBox
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
        // Check if this post is assigned to blocks taxonomy
        $terms = wp_get_post_terms($post->ID, 'funculo_type');
        $hasBlocksTerm = false;

        foreach ($terms as $term) {
            if ($term->slug === 'blocks') {
                $hasBlocksTerm = true;
                break;
            }
        }

        if (!$hasBlocksTerm) {
            return; // Don't show this metabox
        }

        // Add nonce for security
        $this->renderNonce();

        // React container - React will handle the forms
        echo '<div id="blocks-metabox-react" data-post-id="' . esc_attr($post->ID) . '" data-type="blocks"></div>';
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
                // Handle PHP code field with security validation
                if ($field === '_funculo_block_php') {
                    $value = $this->sanitizePhpCode($_POST[$field]);
                    if (empty($value) && !empty($_POST[$field])) {
                        // PHP code validation failed - skip saving this field
                        if (defined('WP_DEBUG') && WP_DEBUG) {
                            error_log("Fanculo: Invalid PHP code rejected for post {$postId}");
                        }
                        continue;
                    }
                } else {
                    $value = sanitize_textarea_field($_POST[$field]);
                }

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