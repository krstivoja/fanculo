<?php

namespace Fanculo\Admin\Api;

use Fanculo\FilesManager\FilesManagerService;

class FileGenerationApiController
{
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
}