<?php

namespace Fanculo\Core;

/**
 * Meta Fields Handler
 * 
 * Handles custom meta fields for fanculo posts based on their taxonomy type:
 * - Blocks: content, style, attributes
 * - Symbols: content, style
 * - SCSS: style
 */
class MetaFields
{
    public function __construct()
    {
        add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
        add_action('save_post', [$this, 'save_meta_fields']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']);
    }

    public function add_meta_boxes(): void
    {
        add_meta_box(
            'fanculo_meta_fields',
            'Fanculo Meta Fields',
            [$this, 'render_meta_box'],
            'fanculo',
            'normal',
            'high'
        );
    }

    public function render_meta_box($post): void
    {
        // Add nonce for security
        wp_nonce_field('fanculo_meta_nonce', 'fanculo_meta_nonce_field');

        // Get current values
        $content = get_post_meta($post->ID, '_fanculo_content', true);
        $style = get_post_meta($post->ID, '_fanculo_style', true);
        $attributes = get_post_meta($post->ID, '_fanculo_attributes', true);

        // Get post taxonomy terms to determine which fields to show
        $terms = wp_get_post_terms($post->ID, 'fanculo_type', ['fields' => 'slugs']);
        $type = !empty($terms) ? $terms[0] : '';

        ?>
        <div id="fanculo-meta-fields">
            <div style="margin-bottom: 20px; padding: 10px; background: #f0f0f1; border-left: 4px solid #0073aa;">
                <p><strong>Current Type:</strong> <span id="current-type"><?php echo $type ?: 'No type selected'; ?></span></p>
                <?php if (!$type): ?>
                <p><em>👆 Select a type from the "Types" metabox above to show relevant fields.</em></p>
                <?php endif; ?>
            </div>

            <!-- Show all fields, let JavaScript control visibility -->
            
            <!-- Content Field (Blocks & Symbols) -->
            <div class="fanculo-field" data-types="blocks,symbols" <?php echo $type && in_array($type, ['blocks', 'symbols']) ? '' : 'style="display: none;"'; ?>>
                <h4>📝 Content</h4>
                <textarea name="fanculo_content" rows="8" style="width: 100%; font-family: monospace;" placeholder="Enter HTML/JSX content..."><?php echo esc_textarea($content); ?></textarea>
                <p class="description">HTML or JSX content for this component.</p>
            </div>

            <!-- Style Field (All types) -->
            <div class="fanculo-field" data-types="blocks,symbols,scss" <?php echo $type ? '' : 'style="display: none;"'; ?>>
                <h4>🎨 Style</h4>
                <textarea name="fanculo_style" rows="8" style="width: 100%; font-family: monospace;" placeholder="Enter CSS/SCSS styles..."><?php echo esc_textarea($style); ?></textarea>
                <p class="description">CSS or SCSS styles for this component.</p>
            </div>

            <!-- Attributes Field (Blocks only) -->
            <div class="fanculo-field" data-types="blocks" <?php echo $type === 'blocks' ? '' : 'style="display: none;"'; ?>>
                <h4>⚙️ Attributes</h4>
                <textarea name="fanculo_attributes" rows="5" style="width: 100%; font-family: monospace;" placeholder='{"prop1": "default", "prop2": true}'><?php echo esc_textarea($attributes); ?></textarea>
                <p class="description">JSON object defining component attributes/props.</p>
            </div>

            <?php if (!$type): ?>
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7;">
                <p><strong>💡 Quick Guide:</strong></p>
                <ul>
                    <li><strong>Blocks:</strong> Content + Style + Attributes</li>
                    <li><strong>Symbols:</strong> Content + Style</li>
                    <li><strong>SCSS:</strong> Style only</li>
                </ul>
            </div>
            <?php endif; ?>
        </div>

        <style>
        #fanculo-meta-fields .fanculo-field {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            background: #f9f9f9;
        }
        #fanculo-meta-fields h4 {
            margin-top: 0;
            color: #333;
        }
        #current-type {
            font-weight: bold;
            color: #0073aa;
        }
        </style>
        <?php
    }

    public function enqueue_admin_scripts($hook): void
    {
        global $post;
        
        if ($hook !== 'post.php' && $hook !== 'post-new.php') {
            return;
        }

        if (!$post || $post->post_type !== 'fanculo') {
            return;
        }

        wp_enqueue_script(
            'fanculo-meta-fields',
            FANCULO_URL . 'assets/admin-meta-fields.js',
            ['jquery'],
            '1.0.0',
            true
        );
    }

    public function save_meta_fields($post_id): void
    {
        // Security checks
        if (!isset($_POST['fanculo_meta_nonce_field'])) {
            return;
        }

        if (!wp_verify_nonce($_POST['fanculo_meta_nonce_field'], 'fanculo_meta_nonce')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Save meta fields
        if (isset($_POST['fanculo_content'])) {
            update_post_meta($post_id, '_fanculo_content', sanitize_textarea_field($_POST['fanculo_content']));
        }

        if (isset($_POST['fanculo_style'])) {
            update_post_meta($post_id, '_fanculo_style', sanitize_textarea_field($_POST['fanculo_style']));
        }

        if (isset($_POST['fanculo_attributes'])) {
            $attributes = sanitize_textarea_field($_POST['fanculo_attributes']);
            // Validate JSON
            if (!empty($attributes)) {
                $decoded = json_decode($attributes, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    update_post_meta($post_id, '_fanculo_attributes', $attributes);
                }
            } else {
                update_post_meta($post_id, '_fanculo_attributes', '');
            }
        }
    }
}