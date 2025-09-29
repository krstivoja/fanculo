<?php

namespace Fanculo\Admin\Api\Controllers;

use Fanculo\Content\FunculoPostType;
use Fanculo\Admin\Api\Services\MetaKeysConstants;

/**
 * Posts Batch API Controller - Batch Operations
 *
 * Handles batch operations including:
 * - Fetching multiple posts by IDs
 * - Batch updating multiple posts
 * - Bulk operations for performance
 */
class PostsBatchApiController extends BaseApiController
{
    public function registerRoutes()
    {
        // Batch fetch multiple posts by IDs
        register_rest_route('funculo/v1', '/posts/batch', [
            'methods' => 'POST',
            'callback' => [$this, 'getBatchPosts'],
            'permission_callback' => [$this, 'checkPermissions'],
            'args' => [
                'post_ids' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param);
                    }
                ],
                'include_meta' => [
                    'default' => true,
                    'sanitize_callback' => 'rest_sanitize_boolean',
                ]
            ]
        ]);

        // Batch update multiple posts
        register_rest_route('funculo/v1', '/posts/batch-update', [
            'methods' => 'PUT',
            'callback' => [$this, 'batchUpdatePosts'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'updates' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param);
                    }
                ]
            ]
        ]);
    }

    public function getBatchPosts($request)
    {
        // This method will be copied from the original controller
        return $this->responseFormatter->collection([], []);
    }

    public function batchUpdatePosts($request)
    {
        // This method will be copied from the original controller
        return $this->responseFormatter->collection([], []);
    }
}