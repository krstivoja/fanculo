<?php

namespace Fanculo\Admin\Api\Security;

use Fanculo\Content\FunculoPostType;
use WP_REST_Request;

class PermissionValidator
{
    /**
     * Check if user can read posts of this plugin's post type
     */
    public static function canReadPosts(): bool
    {
        return current_user_can('edit_posts');
    }

    /**
     * Check if user can create posts of this plugin's post type
     */
    public static function canCreatePosts(): bool
    {
        return current_user_can('publish_posts');
    }

    /**
     * Check if user can delete posts of this plugin's post type
     */
    public static function canDeletePosts(): bool
    {
        return current_user_can('delete_posts');
    }

    /**
     * Check if user can edit a specific post with enhanced security
     */
    public static function canEditSpecificPost(int $postId): bool
    {
        // Check if post exists
        $post = get_post($postId);
        if (!$post) {
            error_log("PermissionValidator: Post $postId not found");
            return false;
        }

        // Verify post type matches our plugin's post type
        if ($post->post_type !== FunculoPostType::getPostType()) {
            error_log("PermissionValidator: Post $postId is not the correct post type. Expected: " . FunculoPostType::getPostType() . ", got: " . $post->post_type);
            return false;
        }

        // Check specific post capability
        if (!current_user_can('edit_post', $postId)) {
            error_log("PermissionValidator: User cannot edit post $postId");
            return false;
        }

        return true;
    }

    /**
     * Check if user can delete a specific post with enhanced security
     */
    public static function canDeleteSpecificPost(int $postId): bool
    {
        // Check if post exists
        $post = get_post($postId);
        if (!$post) {
            error_log("PermissionValidator: Post $postId not found for deletion");
            return false;
        }

        // Verify post type matches our plugin's post type
        if ($post->post_type !== FunculoPostType::getPostType()) {
            error_log("PermissionValidator: Post $postId is not the correct post type for deletion");
            return false;
        }

        // Check specific post deletion capability
        if (!current_user_can('delete_post', $postId)) {
            error_log("PermissionValidator: User cannot delete post $postId");
            return false;
        }

        return true;
    }

    /**
     * Extract and validate post ID from REST request
     */
    public static function getValidatedPostId(WP_REST_Request $request): ?int
    {
        $postId = $request->get_param('id');

        if (!$postId) {
            error_log("PermissionValidator: No post ID provided in request");
            return null;
        }

        $postId = (int) $postId;
        if ($postId <= 0) {
            error_log("PermissionValidator: Invalid post ID: $postId");
            return null;
        }

        return $postId;
    }

    /**
     * Check if user can perform file generation operations
     */
    public static function canGenerateFiles(): bool
    {
        // Require higher privileges for file generation
        return current_user_can('manage_options') || current_user_can('edit_theme_options');
    }

    /**
     * Check if user can access administrative functions
     */
    public static function canAccessAdminFunctions(): bool
    {
        return current_user_can('manage_options');
    }

    /**
     * Validate request has proper nonce (when available)
     */
    public static function validateNonce(WP_REST_Request $request, string $action = 'wp_rest'): bool
    {
        $nonce = $request->get_header('X-WP-Nonce');
        if (!$nonce) {
            // For now, don't require nonce but log when missing
            error_log("PermissionValidator: No nonce provided in REST request");
            return true; // Don't break existing functionality
        }

        return wp_verify_nonce($nonce, $action);
    }

    /**
     * Log security events for audit trail
     */
    public static function logSecurityEvent(string $event, array $context = []): void
    {
        $user = wp_get_current_user();
        $logData = [
            'event' => $event,
            'user_id' => $user->ID,
            'user_login' => $user->user_login,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'timestamp' => current_time('mysql'),
            'context' => $context
        ];

        error_log("SECURITY EVENT: " . json_encode($logData));
    }
}