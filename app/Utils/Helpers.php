<?php

namespace Fanculo\Utils;

class Helpers
{
    /**
     * Get plugin version from main plugin file
     */
    public static function getPluginVersion(): string
    {
        if (!function_exists('get_plugin_data')) {
            require_once(ABSPATH . 'wp-admin/includes/plugin.php');
        }
        
        $plugin_file = self::getPluginPath('fanculo.php');
        $plugin_data = get_plugin_data($plugin_file);
        
        return $plugin_data['Version'] ?? '1.0.0';
    }
    
    /**
     * Get plugin URL
     */
    public static function getPluginUrl(string $path = ''): string
    {
        $url = defined('FANCULO_URL') ? FANCULO_URL : plugin_dir_url(__DIR__ . '/../../fanculo.php');
        return $path ? rtrim($url, '/') . '/' . ltrim($path, '/') : $url;
    }
    
    /**
     * Get plugin path
     */
    public static function getPluginPath(string $path = ''): string
    {
        $pluginPath = defined('FANCULO_PATH') ? FANCULO_PATH : plugin_dir_path(__DIR__ . '/../../fanculo.php');
        return $path ? rtrim($pluginPath, '/') . '/' . ltrim($path, '/') : $pluginPath;
    }
    
    /**
     * Sanitize post data
     */
    public static function sanitizePostData(array $data): array
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            switch ($key) {
                case 'title':
                    $sanitized[$key] = sanitize_text_field($value);
                    break;
                case 'content':
                case 'style':
                    $sanitized[$key] = sanitize_textarea_field($value);
                    break;
                case 'attributes':
                    $sanitized[$key] = self::sanitizeJson($value);
                    break;
                case 'type':
                    $sanitized[$key] = self::sanitizePostType($value);
                    break;
                default:
                    $sanitized[$key] = sanitize_text_field($value);
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize and validate JSON
     */
    public static function sanitizeJson(string $json): string
    {
        if (empty($json)) {
            return '';
        }
        
        $sanitized = sanitize_textarea_field($json);
        $decoded = json_decode($sanitized, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON format');
        }
        
        return $sanitized;
    }
    
    /**
     * Validate post type
     */
    public static function sanitizePostType(string $type): string
    {
        $validTypes = Constants::getTypes();
        $sanitized = sanitize_text_field($type);
        
        if (!in_array($sanitized, $validTypes)) {
            throw new \InvalidArgumentException('Invalid post type');
        }
        
        return $sanitized;
    }
    
    /**
     * Check if user can perform action
     */
    public static function canUserPerformAction(string $action): bool
    {
        switch ($action) {
            case 'manage_settings':
                return current_user_can(Constants::CAP_MANAGE_OPTIONS);
            case 'edit_blocks':
                return current_user_can(Constants::CAP_EDIT_POSTS);
            case 'delete_blocks':
                return current_user_can(Constants::CAP_DELETE_POSTS);
            default:
                return false;
        }
    }
    
    /**
     * Verify nonce
     */
    public static function verifyNonce(string $nonce): bool
    {
        return wp_verify_nonce($nonce, Constants::NONCE_ACTION);
    }
    
    /**
     * Create nonce
     */
    public static function createNonce(): string
    {
        return wp_create_nonce(Constants::NONCE_ACTION);
    }
    
    /**
     * Get admin URL for page
     */
    public static function getAdminUrl(string $page): string
    {
        return admin_url("admin.php?page={$page}");
    }
    
    /**
     * Get AJAX URL
     */
    public static function getAjaxUrl(): string
    {
        return admin_url('admin-ajax.php');
    }
    
    /**
     * Log message if debug mode is enabled
     */
    public static function log(string $message, string $level = 'info'): void
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("[Fanculo] [{$level}] {$message}");
        }
    }
    
    /**
     * Get post meta with default
     */
    public static function getPostMeta(int $postId, string $metaKey, $default = ''): mixed
    {
        $value = get_post_meta($postId, $metaKey, true);
        return $value ?: $default;
    }
    
    /**
     * Get plugin option with default
     */
    public static function getOption(string $optionName, $default = null): mixed
    {
        return get_option($optionName, $default);
    }
    
    /**
     * Update plugin option
     */
    public static function updateOption(string $optionName, $value): bool
    {
        return update_option($optionName, $value);
    }
    
    /**
     * Format post data for API response
     */
    public static function formatPostForApi(\WP_Post $post, string $type = ''): array
    {
        if (!$type) {
            $terms = wp_get_post_terms($post->ID, Constants::TAXONOMY_TYPE, ['fields' => 'slugs']);
            $type = !empty($terms) ? $terms[0] : Constants::TYPE_BLOCKS;
        }
        
        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'type' => $type,
            'content' => self::getPostMeta($post->ID, Constants::META_CONTENT),
            'style' => self::getPostMeta($post->ID, Constants::META_STYLE),
            'attributes' => self::getPostMeta($post->ID, Constants::META_ATTRIBUTES),
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'edit_url' => admin_url("post.php?post={$post->ID}&action=edit"),
            'view_url' => get_permalink($post->ID)
        ];
    }
    
    /**
     * Get posts by type
     */
    public static function getPostsByType(string $type, int $limit = -1): array
    {
        return get_posts([
            'post_type' => Constants::POST_TYPE_FANCULO,
            'numberposts' => $limit,
            'post_status' => 'publish',
            'tax_query' => [
                [
                    'taxonomy' => Constants::TAXONOMY_TYPE,
                    'field' => 'slug',
                    'terms' => $type,
                ],
            ],
            'orderby' => 'date',
            'order' => 'DESC'
        ]);
    }
    
    /**
     * Check if development mode
     */
    public static function isDevelopment(): bool
    {
        return file_exists(self::getPluginPath('env.php'));
    }
    
    /**
     * Get asset URL (dev or production)
     */
    public static function getAssetUrl(string $asset): string
    {
        if (self::isDevelopment()) {
            $envConfig = include self::getPluginPath('env.php');
            $devConfig = $envConfig['dev'] ?? [];
            $host = $devConfig['network_ip'] ?? 'localhost';
            $port = $devConfig['port'] ?? 5177;
            return "http://{$host}:{$port}/{$asset}";
        }
        
        return self::getPluginUrl(Constants::ASSETS_DIR . '/' . $asset);
    }
}