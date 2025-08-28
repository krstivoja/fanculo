<?php

namespace Fanculo\Admin;

class Settings
{
    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_menu_page']);
        add_action('wp_ajax_fanculo_create_post', [$this, 'create_post']);
        add_action('wp_ajax_fanculo_get_posts', [$this, 'get_posts']);
    }

    public function add_menu_page(): void
    {
        add_menu_page(
            'Fanculo Settings',
            'Fanculo',
            'manage_options',
            'fanculo',
            [$this, 'settings_page'],
            'dashicons-admin-generic',
            100
        );
    }

    public function settings_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $assets = new Assets();
        ?>
        <div class="wrap">
            <div id="fanculo-root"></div>
        </div>

        <?php echo $assets->getDevScripts(); ?>
        <script type="module" src="<?php echo $assets->asset('src/main.tsx'); ?>"></script>

        <script>
        window.fanculo_ajax = {
            ajax_url: '<?php echo admin_url('admin-ajax.php'); ?>',
            nonce: '<?php echo wp_create_nonce('fanculo_nonce'); ?>'
        };
        </script>
        <?php
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
        $content = sanitize_textarea_field($_POST['content'] ?? '');
        $style = sanitize_textarea_field($_POST['style'] ?? '');
        $attributes = sanitize_textarea_field($_POST['attributes'] ?? '');

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
        wp_set_post_terms($post_id, [$type], 'fanculo_type');

        // Save meta fields based on type
        if ($content && in_array($type, ['blocks', 'symbols'])) {
            update_post_meta($post_id, '_fanculo_content', $content);
        }

        if ($style) {
            update_post_meta($post_id, '_fanculo_style', $style);
        }

        if ($attributes && $type === 'blocks') {
            // Validate JSON
            if (!empty($attributes)) {
                $decoded = json_decode($attributes, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    update_post_meta($post_id, '_fanculo_attributes', $attributes);
                } else {
                    wp_send_json_error('Invalid JSON in attributes field');
                }
            }
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
}