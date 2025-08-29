<?php

namespace Fanculo\Controllers;

class PostController
{
    public function __construct()
    {
        add_action('wp_ajax_fanculo_create_post', [$this, 'create_post']);
        add_action('wp_ajax_fanculo_update_post', [$this, 'update_post']);
        add_action('wp_ajax_fanculo_get_post', [$this, 'get_post']);
        add_action('wp_ajax_fanculo_get_posts', [$this, 'get_posts']);
        add_action('wp_ajax_fanculo_delete_post', [$this, 'delete_post']);
    }

    public function create_post(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Permission denied');
        }

        $title = sanitize_text_field($_POST['title'] ?? '');
        $type = sanitize_text_field($_POST['type'] ?? 'blocks');
        $content = wp_unslash($_POST['content'] ?? ''); // Save content as-is without filtering
        $style = wp_unslash($_POST['style'] ?? ''); // Save CSS as-is without filtering
        $attributes = sanitize_textarea_field($_POST['attributes'] ?? '');
        $editor_style = wp_unslash($_POST['editor_style'] ?? ''); // Save editor style as-is
        $view_js = wp_unslash($_POST['view_js'] ?? ''); // Save view JS as-is
        $description = sanitize_textarea_field($_POST['description'] ?? ''); // Save description

        if (empty($title)) {
            wp_send_json_error('Title is required');
        }

        // Validate post type
        if (!in_array($type, ['blocks', 'symbols', 'scss'])) {
            wp_send_json_error('Invalid post type');
        }

        // Create the post
        $post_data = [
            'post_title' => $title,
            'post_type' => 'fanculo',
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ];

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            wp_send_json_error($post_id->get_error_message());
        }

        // Set the taxonomy term
        $term = get_term_by('slug', $type, 'fanculo_type');
        if (!$term) {
            $term_result = wp_insert_term($type, 'fanculo_type', ['slug' => $type]);
            if (!is_wp_error($term_result)) {
                $term = get_term($term_result['term_id']);
            }
        }
        
        if ($term) {
            wp_set_post_terms($post_id, [$term->term_id], 'fanculo_type');
        }

        // Save meta fields based on type
        if ($content && in_array($type, ['blocks', 'symbols'])) {
            update_post_meta($post_id, '_fanculo_content', $content);
        }

        if ($style) {
            update_post_meta($post_id, '_fanculo_style', $style);
        }

        // Save description for all post types (but mainly used for blocks)
        if ($description) {
            update_post_meta($post_id, '_fanculo_description', $description);
        }

        if ($type === 'blocks') {
            if (!empty($attributes)) {
                $decoded = json_decode($attributes, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    update_post_meta($post_id, '_fanculo_attributes', $attributes);
                } else {
                    wp_send_json_error('Invalid JSON in attributes field');
                }
            }
            
            // Save editor style and view JS for blocks only
            update_post_meta($post_id, '_fanculo_editor_style', $editor_style);
            update_post_meta($post_id, '_fanculo_view_js', $view_js);
            
            // Save toggle states
            $enable_editor_style = isset($_POST['enable_editor_style']) ? sanitize_text_field($_POST['enable_editor_style']) : 'false';
            $enable_view_js = isset($_POST['enable_view_js']) ? sanitize_text_field($_POST['enable_view_js']) : 'false';
            update_post_meta($post_id, '_fanculo_enable_editor_style', $enable_editor_style);
            update_post_meta($post_id, '_fanculo_enable_view_js', $enable_view_js);
        }

        wp_send_json_success([
            'post_id' => $post_id,
            'edit_url' => admin_url("post.php?post={$post_id}&action=edit"),
            'view_url' => get_permalink($post_id)
        ]);
    }

    public function get_posts(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Permission denied');
        }

        // Get posts by taxonomy type
        $posts_by_type = [
            'blocks' => [],
            'symbols' => [],
            'scss' => []
        ];

        foreach (['blocks', 'symbols', 'scss'] as $type) {
            $posts = get_posts([
                'post_type' => 'fanculo',
                'numberposts' => -1,
                'post_status' => 'publish',
                'tax_query' => [
                    [
                        'taxonomy' => 'fanculo_type',
                        'field' => 'slug',
                        'terms' => $type,
                    ],
                ],
                'orderby' => 'date',
                'order' => 'DESC'
            ]);

            foreach ($posts as $post) {
                $posts_by_type[$type][] = [
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'date' => $post->post_date,
                    'edit_url' => admin_url("post.php?post={$post->ID}&action=edit"),
                    'view_url' => get_permalink($post->ID)
                ];
            }
        }

        wp_send_json_success($posts_by_type);
    }

    public function get_post(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Permission denied');
        }

        $post_id = intval($_POST['post_id'] ?? 0);
        if (!$post_id) {
            wp_send_json_error('Invalid post ID');
        }

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'fanculo') {
            wp_send_json_error('Post not found');
        }

        // Get taxonomy terms
        $terms = wp_get_post_terms($post_id, 'fanculo_type', ['fields' => 'slugs']);
        $type = !empty($terms) ? $terms[0] : 'blocks';

        // Get meta fields
        $content = get_post_meta($post_id, '_fanculo_content', true);
        $style = get_post_meta($post_id, '_fanculo_style', true);
        $attributes = get_post_meta($post_id, '_fanculo_attributes', true);
        $editor_style = get_post_meta($post_id, '_fanculo_editor_style', true);
        $view_js = get_post_meta($post_id, '_fanculo_view_js', true);
        $description = get_post_meta($post_id, '_fanculo_description', true);
        $enable_editor_style = get_post_meta($post_id, '_fanculo_enable_editor_style', true);
        $enable_view_js = get_post_meta($post_id, '_fanculo_enable_view_js', true);

        wp_send_json_success([
            'id' => $post->ID,
            'title' => $post->post_title,
            'type' => $type,
            'content' => $content ?: '',
            'style' => $style ?: '',
            'attributes' => $attributes ?: '',
            'editor_style' => $editor_style ?: '',
            'view_js' => $view_js ?: '',
            'description' => $description ?: '',
            'enable_editor_style' => $enable_editor_style === 'true',
            'enable_view_js' => $enable_view_js === 'true'
        ]);
    }

    public function update_post(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Permission denied');
        }

        $post_id = intval($_POST['post_id'] ?? 0);
        if (!$post_id) {
            wp_send_json_error('Invalid post ID');
        }

        $title = sanitize_text_field($_POST['title'] ?? '');
        $content = wp_unslash($_POST['content'] ?? ''); // Save content as-is without filtering
        $style = wp_unslash($_POST['style'] ?? ''); // Save CSS as-is without filtering
        $attributes = sanitize_textarea_field($_POST['attributes'] ?? '');
        $editor_style = wp_unslash($_POST['editor_style'] ?? ''); // Save editor style as-is
        $view_js = wp_unslash($_POST['view_js'] ?? ''); // Save view JS as-is
        $description = sanitize_textarea_field($_POST['description'] ?? ''); // Save description

        if (empty($title)) {
            wp_send_json_error('Title is required');
        }

        // Update the post
        $post_data = [
            'ID' => $post_id,
            'post_title' => $title,
        ];

        $updated_post_id = wp_update_post($post_data);
        if (is_wp_error($updated_post_id)) {
            wp_send_json_error($updated_post_id->get_error_message());
        }

        // Get current post type (don't allow changing it during edit)
        $terms = wp_get_post_terms($post_id, 'fanculo_type', ['fields' => 'slugs']);
        $type = !empty($terms) ? $terms[0] : 'blocks';

        // Update meta fields
        if ($content || in_array($type, ['blocks', 'symbols'])) {
            update_post_meta($post_id, '_fanculo_content', $content);
        }

        update_post_meta($post_id, '_fanculo_style', $style);

        // Update description
        update_post_meta($post_id, '_fanculo_description', $description);

        if ($type === 'blocks') {
            if (!empty($attributes)) {
                $decoded = json_decode($attributes, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    update_post_meta($post_id, '_fanculo_attributes', $attributes);
                } else {
                    wp_send_json_error('Invalid JSON in attributes field');
                }
            } else {
                update_post_meta($post_id, '_fanculo_attributes', '');
            }
            
            // Update editor style and view JS for blocks only
            update_post_meta($post_id, '_fanculo_editor_style', $editor_style);
            update_post_meta($post_id, '_fanculo_view_js', $view_js);
            
            // Update toggle states
            $enable_editor_style = isset($_POST['enable_editor_style']) ? sanitize_text_field($_POST['enable_editor_style']) : 'false';
            $enable_view_js = isset($_POST['enable_view_js']) ? sanitize_text_field($_POST['enable_view_js']) : 'false';
            update_post_meta($post_id, '_fanculo_enable_editor_style', $enable_editor_style);
            update_post_meta($post_id, '_fanculo_enable_view_js', $enable_view_js);
        }

        wp_send_json_success([
            'post_id' => $post_id,
            'edit_url' => admin_url("post.php?post={$post_id}&action=edit"),
            'view_url' => get_permalink($post_id)
        ]);
    }

    public function delete_post(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('delete_posts')) {
            wp_send_json_error('Permission denied');
        }

        $post_id = intval($_POST['post_id'] ?? 0);
        if (!$post_id) {
            wp_send_json_error('Invalid post ID');
        }

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'fanculo') {
            wp_send_json_error('Post not found');
        }

        $deleted = wp_delete_post($post_id, true);
        if (!$deleted) {
            wp_send_json_error('Error deleting post');
        }

        wp_send_json_success(['post_id' => $post_id]);
    }
}