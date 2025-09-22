<?php

namespace Fanculo\Content\MetaBoxes;

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
            // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verification handled in parent canSave() method
            if (isset($_POST[$field])) {
                // Handle PHP code field with security validation
                if ($field === '_funculo_symbol_php') {
                    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verification handled in parent canSave() method
                    $value = $this->sanitizePhpCode(wp_unslash($_POST[$field]));
                    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verification handled in parent canSave() method
                    if (empty($value) && !empty(wp_unslash($_POST[$field]))) {
                        // PHP code validation failed - skip saving this field
                        continue;
                    }
                } else {
                    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verification handled in parent canSave() method
                    $value = sanitize_textarea_field(wp_unslash($_POST[$field]));
                }
                $this->saveMetaValue($postId, $field, $value);
            }
        }
    }
}