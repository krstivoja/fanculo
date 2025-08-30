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
        add_action('wp_ajax_fanculo_get_block_categories', [$this, 'get_block_categories']);
        add_action('wp_ajax_fanculo_export_block', [$this, 'export_block']);
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
        $category = sanitize_text_field($_POST['category'] ?? ''); // Save block category
        $icon = sanitize_text_field($_POST['icon'] ?? ''); // Save block icon

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

        // Save block category (mainly used for blocks)
        if ($category) {
            update_post_meta($post_id, '_fanculo_category', $category);
        }

        // Save block icon (mainly used for blocks)
        if ($icon) {
            update_post_meta($post_id, '_fanculo_icon', $icon);
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
            
            // Export as Gutenberg block to filesystem
            $this->export_block_to_filesystem($post_id);
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
                    'view_url' => get_permalink($post->ID),
                    'icon' => get_post_meta($post->ID, '_fanculo_icon', true)
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
        $category = get_post_meta($post_id, '_fanculo_category', true);
        $icon = get_post_meta($post_id, '_fanculo_icon', true);

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
            'category' => $category ?: '',
            'icon' => $icon ?: 'smiley'
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
        $category = sanitize_text_field($_POST['category'] ?? ''); // Save block category
        $icon = sanitize_text_field($_POST['icon'] ?? ''); // Save block icon

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

        // Update description, category, and icon
        update_post_meta($post_id, '_fanculo_description', $description);
        update_post_meta($post_id, '_fanculo_category', $category);
        update_post_meta($post_id, '_fanculo_icon', $icon);

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
            
            // Export as Gutenberg block to filesystem
            $this->export_block_to_filesystem($post_id);
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

        // Get post type and title before deletion for cleanup
        $post_type_taxonomy = wp_get_post_terms($post_id, 'fanculo_type', ['fields' => 'slugs']);
        $is_block = !empty($post_type_taxonomy) && in_array('blocks', $post_type_taxonomy);
        $post_title = $post->post_title;

        $deleted = wp_delete_post($post_id, true);
        if (!$deleted) {
            wp_send_json_error('Error deleting post');
        }

        // Clean up filesystem files if this was a block
        if ($is_block) {
            $this->cleanup_block_files($post_id, $post_title);
        }

        wp_send_json_success(['post_id' => $post_id]);
    }

    public function get_block_categories(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Permission denied');
        }

        $categories = get_default_block_categories();
        
        // Format categories for select dropdown
        $formatted_categories = array_map(function($category) {
            return [
                'slug' => $category['slug'],
                'title' => $category['title']
            ];
        }, $categories);

        wp_send_json_success($formatted_categories);
    }

    /**
     * Export a block post to filesystem as a proper Gutenberg block
     */
    private function export_block_to_filesystem($post_id): void
    {
        $post = get_post($post_id);
        if (!$post) {
            return;
        }

        // Check if this is an update with a title change
        $current_folder_name = sanitize_title($post->post_title);
        $this->cleanup_old_block_folders($post_id, $current_folder_name);

        // Get all post meta data
        $content = get_post_meta($post_id, '_fanculo_content', true);
        $style = get_post_meta($post_id, '_fanculo_style', true);
        $editor_style = get_post_meta($post_id, '_fanculo_editor_style', true);
        $view_js = get_post_meta($post_id, '_fanculo_view_js', true);
        $attributes = get_post_meta($post_id, '_fanculo_attributes', true);
        $description = get_post_meta($post_id, '_fanculo_description', true);
        $category = get_post_meta($post_id, '_fanculo_category', true);
        $icon = get_post_meta($post_id, '_fanculo_icon', true);

        // Create folder name from post title slug
        $folder_name = sanitize_title($post->post_title);
        
        // Define the blocks directory
        $blocks_dir = WP_CONTENT_DIR . '/plugins/fanculo-blocks';
        $block_dir = $blocks_dir . '/' . $folder_name;

        // Create directories if they don't exist
        if (!file_exists($blocks_dir)) {
            wp_mkdir_p($blocks_dir);
        }
        
        if (!file_exists($block_dir)) {
            wp_mkdir_p($block_dir);
        }

        // Save render.php - wrap content in PHP block context
        if (!empty($content)) {
            // If content doesn't start with <?php, it's likely HTML content
            if (strpos(trim($content), '<?php') !== 0) {
                $php_render_content = "<?php\n/**\n * Render callback for the fanculo/{$folder_name} block.\n *\n * @param array    \$attributes The block attributes.\n * @param string   \$content    The block default content.\n * @param WP_Block \$block      The block instance.\n */\n\n// Extract attributes\n\$block_attributes = \$attributes ?? [];\n\n// Output the block content\necho wp_kses_post('" . addslashes($content) . "');\n";
            } else {
                // It's already PHP code, use as-is
                $php_render_content = $content;
            }
            file_put_contents($block_dir . '/render.php', $php_render_content);
        }

        // Save style.css
        if (!empty($style)) {
            file_put_contents($block_dir . '/style.css', $style);
        }

        // Save editor.css
        if (!empty($editor_style)) {
            file_put_contents($block_dir . '/editor.css', $editor_style);
        }

        // Save view.js
        if (!empty($view_js)) {
            file_put_contents($block_dir . '/view.js', $view_js);
        }

        // Create index.asset.php with dependencies and unique version
        $asset_content = "<?php \nreturn array(\n    'dependencies' => array(\n        'wp-block-editor',\n        'wp-blocks',\n        'wp-element',\n        'wp-i18n',\n        'wp-server-side-render'\n    ),\n    'version' => '" . time() . microtime(true) * 1000000 . "'\n);";
        file_put_contents($block_dir . '/index.asset.php', $asset_content);

        // Create index.js for block registration
        $js_content = "import { registerBlockType } from '@wordpress/blocks';
import ServerSideRender from '@wordpress/server-side-render';
import { useBlockProps } from '@wordpress/block-editor';

registerBlockType('fanculo/" . $folder_name . "', {
    edit: function(props) {
        const blockProps = useBlockProps();
        return (
            <div {...blockProps}>
                <ServerSideRender
                    block=\"fanculo/" . $folder_name . "\"
                    attributes={props.attributes}
                />
            </div>
        );
    },
    save: function() {
        return null; // Server-side rendering
    }
});";
        file_put_contents($block_dir . '/index.js', $js_content);

        // Create block.json
        $block_json = [
            'apiVersion' => 2,
            'name' => 'fanculo/' . $folder_name,
            'title' => $post->post_title,
            'category' => $category ?: 'widgets',
            'icon' => $icon ?: 'smiley',
            'description' => $description ?: '',
            'supports' => [
                'html' => false
            ],
            'textdomain' => 'fanculo-blocks',
            'editorScript' => 'file:./index.js',
            'editorStyle' => !empty($editor_style) ? 'file:./editor.css' : null,
            'style' => !empty($style) ? 'file:./style.css' : null,
            'viewScript' => !empty($view_js) ? 'file:./view.js' : null,
            'render' => !empty($content) ? 'file:./render.php' : null,
            '_fanculo_post_id' => $post_id  // Internal tracking for cleanup
        ];

        // Parse attributes if they exist
        if (!empty($attributes)) {
            $parsed_attributes = json_decode($attributes, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($parsed_attributes)) {
                $block_json['attributes'] = $parsed_attributes;
            }
        }

        // Remove null values
        $block_json = array_filter($block_json, function($value) {
            return $value !== null;
        });

        // Save block.json
        file_put_contents(
            $block_dir . '/block.json', 
            json_encode($block_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        // Ensure main plugin file and manifest exist
        $this->ensure_plugin_infrastructure($blocks_dir);
    }

    /**
     * Clean up old block folders when title changes
     */
    private function cleanup_old_block_folders($post_id, $current_folder_name): void
    {
        $blocks_dir = WP_CONTENT_DIR . '/plugins/fanculo-blocks';
        if (!is_dir($blocks_dir)) {
            return;
        }

        // Get all existing folders
        $existing_folders = array_filter(scandir($blocks_dir), function($item) use ($blocks_dir) {
            return $item !== '.' && $item !== '..' && is_dir($blocks_dir . '/' . $item);
        });

        // Look for folders that might belong to this post but have different names
        foreach ($existing_folders as $folder_name) {
            if ($folder_name === $current_folder_name) {
                continue; // Skip the current correct folder
            }

            $block_json_path = $blocks_dir . '/' . $folder_name . '/block.json';
            if (file_exists($block_json_path)) {
                $block_data = json_decode(file_get_contents($block_json_path), true);
                
                // Check if this block belongs to the same post ID (title was changed)
                if (isset($block_data['_fanculo_post_id']) && $block_data['_fanculo_post_id'] == $post_id) {
                    // This is an old folder for the same post - clean it up
                    $old_block_dir = $blocks_dir . '/' . $folder_name;
                    $this->recursive_rmdir($old_block_dir);
                    
                    // Regenerate manifest after cleanup
                    $this->generate_blocks_manifest($blocks_dir);
                }
            }
        }
    }

    /**
     * Clean up block files when block is deleted
     */
    private function cleanup_block_files($post_id, $post_title): void
    {
        $blocks_dir = WP_CONTENT_DIR . '/plugins/fanculo-blocks';
        if (!is_dir($blocks_dir)) {
            return;
        }

        // First try to find by current title
        $folder_name = sanitize_title($post_title);
        $block_dir = $blocks_dir . '/' . $folder_name;

        if (is_dir($block_dir)) {
            $this->recursive_rmdir($block_dir);
            $this->generate_blocks_manifest($blocks_dir);
            return;
        }

        // If not found by title, search all folders for matching post_id
        $existing_folders = array_filter(scandir($blocks_dir), function($item) use ($blocks_dir) {
            return $item !== '.' && $item !== '..' && is_dir($blocks_dir . '/' . $item);
        });

        foreach ($existing_folders as $folder_name) {
            $block_json_path = $blocks_dir . '/' . $folder_name . '/block.json';
            if (file_exists($block_json_path)) {
                $block_data = json_decode(file_get_contents($block_json_path), true);
                
                // Check if this block belongs to the deleted post
                if (isset($block_data['_fanculo_post_id']) && $block_data['_fanculo_post_id'] == $post_id) {
                    $block_dir = $blocks_dir . '/' . $folder_name;
                    $this->recursive_rmdir($block_dir);
                    
                    // Regenerate manifest after deletion
                    $this->generate_blocks_manifest($blocks_dir);
                    break; // Found and cleaned up
                }
            }
        }
    }

    /**
     * Recursively remove directory and all its contents
     */
    private function recursive_rmdir($dir): bool
    {
        if (!is_dir($dir)) {
            return false;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                $this->recursive_rmdir($path);
            } else {
                unlink($path);
            }
        }

        return rmdir($dir);
    }

    /**
     * Ensure plugin infrastructure files exist and are up to date
     */
    private function ensure_plugin_infrastructure($blocks_dir): void
    {
        // Create main plugin file
        $this->create_main_plugin_file($blocks_dir);
        
        // Generate blocks manifest
        $this->generate_blocks_manifest($blocks_dir);
    }

    /**
     * Create the main plugin file for fanculo-blocks
     */
    private function create_main_plugin_file($blocks_dir): void
    {
        $plugin_file = $blocks_dir . '/fanculo-blocks.php';
        
        $plugin_content = '<?php
/**
 * Plugin Name:       Fanculo Generated Blocks
 * Plugin URI:        https://github.com/your-org/fanculo-blocks
 * Description:       Dynamically generated Gutenberg blocks from Fanculo editor
 * Version:           1.0.0
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            Fanculo
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       fanculo-blocks
 *
 * @package FanculoBlocks
 */

if (!defined(\'ABSPATH\')) {
    exit; // Exit if accessed directly.
}

/**
 * Registers all blocks using the modern WordPress 6.8 block registration system
 * This approach uses blocks-manifest.php for improved performance
 *
 * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
 */
function fanculo_blocks_init(): void
{
    $manifest_path = __DIR__ . \'/blocks-manifest.php\';
    
    if (!file_exists($manifest_path)) {
        return;
    }

    /**
     * WordPress 6.8+ - Most efficient registration method
     * Registers block metadata collection and block types in one call
     */
    if (function_exists(\'wp_register_block_types_from_metadata_collection\')) {
        wp_register_block_types_from_metadata_collection(__DIR__, $manifest_path);
        return;
    }

    /**
     * WordPress 6.7+ - Register metadata collection first, then block types
     * Improves performance by batching metadata operations
     */
    if (function_exists(\'wp_register_block_metadata_collection\')) {
        wp_register_block_metadata_collection(__DIR__, $manifest_path);
    }

    /**
     * Register individual block types from manifest
     * Compatible with WordPress 6.7+
     */
    $manifest_data = require $manifest_path;
    foreach (array_keys($manifest_data) as $block_folder) {
        $block_path = __DIR__ . "/{$block_folder}";
        if (is_dir($block_path)) {
            register_block_type($block_path);
        }
    }
}
add_action(\'init\', \'fanculo_blocks_init\');

/**
 * Load plugin text domain for translations
 */
function fanculo_blocks_load_textdomain(): void
{
    load_plugin_textdomain(\'fanculo-blocks\', false, dirname(plugin_basename(__FILE__)) . \'/languages\');
}
add_action(\'plugins_loaded\', \'fanculo_blocks_load_textdomain\');
';

        file_put_contents($plugin_file, $plugin_content);
    }

    /**
     * Generate blocks-manifest.php file with all current blocks
     */
    private function generate_blocks_manifest($blocks_dir): void
    {
        $manifest_path = $blocks_dir . '/blocks-manifest.php';
        
        if (!is_dir($blocks_dir)) {
            return;
        }

        // Get all block directories
        $block_folders = array_filter(scandir($blocks_dir), function($item) use ($blocks_dir) {
            return $item !== '.' && $item !== '..' && 
                   is_dir($blocks_dir . '/' . $item) && 
                   file_exists($blocks_dir . '/' . $item . '/block.json');
        });

        $manifest_data = [];

        foreach ($block_folders as $folder_name) {
            $block_json_path = $blocks_dir . '/' . $folder_name . '/block.json';
            
            if (file_exists($block_json_path)) {
                $block_data = json_decode(file_get_contents($block_json_path), true);
                
                if ($block_data && isset($block_data['name'])) {
                    // Remove internal tracking field from manifest
                    unset($block_data['_fanculo_post_id']);
                    
                    $manifest_data[$folder_name] = $block_data;
                }
            }
        }

        // Generate PHP array format for the manifest
        $manifest_content = "<?php\n";
        $manifest_content .= "// This file is generated automatically by Fanculo. Do not modify it manually.\n";
        $manifest_content .= "// Last updated: " . date('Y-m-d H:i:s') . "\n";
        $manifest_content .= "return " . var_export($manifest_data, true) . ";\n";

        file_put_contents($manifest_path, $manifest_content);
    }
}