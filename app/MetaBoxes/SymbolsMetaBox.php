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
        <?php
    }

    protected function saveFields($postId)
    {
        $fields = [
            '_funculo_symbol_php'
        ];

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                $value = sanitize_textarea_field($_POST[$field]);
                $this->saveMetaValue($postId, $field, $value);
            }
        }
    }
}