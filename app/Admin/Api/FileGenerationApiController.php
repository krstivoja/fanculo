<?php

namespace Fanculo\Admin\Api;

use Fanculo\Services\FileGenerationService;

class FileGenerationApiController
{
    public function regenerateFiles($request)
    {
        try {
            $fileGenerationService = new FileGenerationService();
            $fileGenerationService->regenerateAllFiles();

            return new \WP_REST_Response([
                'success' => true,
                'message' => 'All files have been regenerated successfully.'
            ], 200);
        } catch (\Exception $e) {
            return new \WP_Error('regeneration_failed', 'Failed to regenerate files: ' . $e->getMessage(), ['status' => 500]);
        }
    }
}