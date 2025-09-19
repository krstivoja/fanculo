<?php

namespace Fanculo\Admin\Api;

use Fanculo\FilesManager\FilesManagerService;

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
        return current_user_can('publish_posts');
    }

    public function regenerateFiles($request)
    {
        try {
            $filesManagerService = new FilesManagerService();
            $filesManagerService->regenerateAllFiles();

            return new \WP_REST_Response([
                'success' => true,
                'message' => 'All files have been regenerated successfully.'
            ], 200);
        } catch (\Exception $e) {
            return new \WP_Error('regeneration_failed', 'Failed to regenerate files: ' . $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Force regenerate all files (used by manual "Regenerate All" button)
     */
    public function forceRegenerateAll($request)
    {
        try {

            $filesManagerService = new FilesManagerService();
            $filesManagerService->regenerateAllFiles();


            return new \WP_REST_Response([
                'success' => true,
                'message' => 'All files have been forcefully regenerated successfully.',
                'timestamp' => current_time('c')
            ], 200);
        } catch (\Exception $e) {

            return new \WP_Error('force_regeneration_failed', 'Failed to force regenerate files: ' . $e->getMessage(), [
                'status' => 500,
                'timestamp' => current_time('c')
            ]);
        }
    }
}