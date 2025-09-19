<?php

namespace Fanculo\MetaBoxes;

class SymbolsMetaBox extends AbstractMetaBox
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
        // Check if this post is assigned to symbols taxonomy
        $terms = wp_get_post_terms($post->ID, 'funculo_type');
        $hasSymbolsTerm = false;

        foreach ($terms as $term) {
            if ($term->slug === 'symbols') {
                $hasSymbolsTerm = true;
                break;
            }
        }

        if (!$hasSymbolsTerm) {
            return; // Don't show this metabox
        }

        // Add nonce for security
        $this->renderNonce();

        // React container - React will handle the forms
        echo '<div id="symbols-metabox-react" data-post-id="' . esc_attr($post->ID) . '" data-type="symbols"></div>';
    }

    protected function saveFields($postId)
    {
        $fields = [
            '_funculo_symbol_php'
        ];

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                // Handle PHP code field with security validation
                if ($field === '_funculo_symbol_php') {
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
                $this->saveMetaValue($postId, $field, $value);
            }
        }
    }
}