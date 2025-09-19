<?php

namespace Fanculo\Admin\Api;

use Fanculo\FilesManager\FilesManagerService;
use Fanculo\Admin\Api\Security\PermissionValidator;
use Fanculo\Admin\Api\Security\RateLimiter;

class FileGenerationApiController
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
        // File generation routes
        register_rest_route('funculo/v1', '/regenerate-files', [
            'methods' => 'POST',
            'callback' => [$this, 'regenerateFiles'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
        ]);

        // Force regenerate all files (manual button)
        register_rest_route('funculo/v1', '/force-regenerate-all', [
            'methods' => 'POST',
            'callback' => [$this, 'forceRegenerateAll'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
        ]);
    }

    public function checkCreatePermissions()
    {
        // File generation requires higher privileges
        if (!PermissionValidator::canGenerateFiles()) {
            PermissionValidator::logSecurityEvent('file_generation_permission_denied');
            return false;
        }

        return true;
    }

    public function regenerateFiles($request)
    {
        // Check rate limit
        $rateLimitCheck = RateLimiter::checkRateLimit('file_generation');
        if (!$rateLimitCheck['allowed']) {
            PermissionValidator::logSecurityEvent('file_generation_rate_limited');
            return new \WP_Error('rate_limit_exceeded', 'Rate limit exceeded. Please wait before trying again.', [
                'status' => 429,
                'reset_time' => $rateLimitCheck['reset_time'] ?? null
            ]);
        }

        try {
            PermissionValidator::logSecurityEvent('file_regeneration_started', [
                'user_id' => get_current_user_id(),
                'remaining_requests' => $rateLimitCheck['remaining']
            ]);

            $filesManagerService = new FilesManagerService();
            $filesManagerService->regenerateAllFiles();

            PermissionValidator::logSecurityEvent('file_regeneration_completed', [
                'user_id' => get_current_user_id()
            ]);

            return new \WP_REST_Response([
                'success' => true,
                'message' => 'All files have been regenerated successfully.',
                'rate_limit' => [
                    'remaining' => $rateLimitCheck['remaining'] - 1
                ]
            ], 200);
        } catch (\Exception $e) {
            PermissionValidator::logSecurityEvent('file_regeneration_failed', [
                'error' => $e->getMessage(),
                'user_id' => get_current_user_id()
            ]);

            return new \WP_Error('regeneration_failed', 'Failed to regenerate files: ' . $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Force regenerate all files (used by manual "Regenerate All" button)
     */
    public function forceRegenerateAll($request)
    {
        // Check rate limit (use same limit as regular regeneration)
        $rateLimitCheck = RateLimiter::checkRateLimit('file_generation');
        if (!$rateLimitCheck['allowed']) {
            PermissionValidator::logSecurityEvent('force_file_generation_rate_limited');
            return new \WP_Error('rate_limit_exceeded', 'Rate limit exceeded. Please wait before trying again.', [
                'status' => 429,
                'reset_time' => $rateLimitCheck['reset_time'] ?? null
            ]);
        }

        try {
            PermissionValidator::logSecurityEvent('force_file_regeneration_started', [
                'user_id' => get_current_user_id(),
                'remaining_requests' => $rateLimitCheck['remaining']
            ]);

            $filesManagerService = new FilesManagerService();
            $filesManagerService->regenerateAllFiles();

            PermissionValidator::logSecurityEvent('force_file_regeneration_completed', [
                'user_id' => get_current_user_id()
            ]);

            return new \WP_REST_Response([
                'success' => true,
                'message' => 'All files have been forcefully regenerated successfully.',
                'timestamp' => current_time('c'),
                'rate_limit' => [
                    'remaining' => $rateLimitCheck['remaining'] - 1
                ]
            ], 200);
        } catch (\Exception $e) {
            PermissionValidator::logSecurityEvent('force_file_regeneration_failed', [
                'error' => $e->getMessage(),
                'user_id' => get_current_user_id()
            ]);

            return new \WP_Error('force_regeneration_failed', 'Failed to force regenerate files: ' . $e->getMessage(), [
                'status' => 500,
                'timestamp' => current_time('c')
            ]);
        }
    }
}