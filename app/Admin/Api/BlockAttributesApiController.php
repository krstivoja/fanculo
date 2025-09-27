<?php

namespace Fanculo\Admin\Api;

use Fanculo\Database\BlockAttributesRepository;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * REST API controller for block attributes
 */
class BlockAttributesApiController
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    /**
     * Register API routes
     */
    public function registerRoutes(): void
    {
        // Use simpler route pattern that works
        register_rest_route('fanculo/v1', '/block-attributes/(?P<post_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getAttributes'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'saveAttributes'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'deleteAllAttributes'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ]
        ]);

        // Keep the other route for compatibility
        register_rest_route('fanculo/v1', '/blocks/(?P<post_id>\d+)/attributes', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getAttributes'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'saveAttributes'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'deleteAllAttributes'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ]
        ]);

        error_log('Fanculo: Route registration result for blocks/attributes: ' . ($result ? 'success' : 'failed'));

        // Single attribute operations
        register_rest_route('fanculo/v1', '/blocks/(?P<post_id>\d+)/attributes/(?P<attr_id>\d+)', [
            [
                'methods' => 'PUT',
                'callback' => [$this, 'updateAttribute'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ],
                    'attr_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'deleteAttribute'],
                'permission_callback' => [$this, 'checkPermission'],
                'args' => [
                    'post_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ],
                    'attr_id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ]
        ]);

        // Bulk operations
        register_rest_route('fanculo/v1', '/blocks/attributes/bulk', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'getAttributesBulk'],
                'permission_callback' => [$this, 'checkPermission']
            ]
        ]);

        // Migration endpoint
        register_rest_route('fanculo/v1', '/blocks/attributes/migrate', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'migrateAttributes'],
                'permission_callback' => [$this, 'checkPermission']
            ]
        ]);
    }

    /**
     * Check if user has permission to access the API
     */
    public function checkPermission(): bool
    {
        return current_user_can('edit_posts');
    }

    /**
     * Get attributes for a block
     */
    public function getAttributes(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = intval($request->get_param('post_id'));

        // Verify the post exists and is of type 'funculo'
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'funculo') {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Invalid post ID'
            ], 404);
        }

        $attributes = BlockAttributesRepository::get($post_id);

        return new WP_REST_Response([
            'success' => true,
            'data' => $attributes
        ], 200);
    }

    /**
     * Save attributes for a block (replaces all)
     */
    public function saveAttributes(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = intval($request->get_param('post_id'));
        $attributes = $request->get_json_params();

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'funculo') {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Invalid post ID'
            ], 404);
        }

        // Validate attributes array
        if (!isset($attributes['attributes']) || !is_array($attributes['attributes'])) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Invalid attributes data'
            ], 400);
        }

        // Validate each attribute
        foreach ($attributes['attributes'] as $attr) {
            if (empty($attr['name']) || empty($attr['type'])) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Each attribute must have a name and type'
                ], 400);
            }
        }

        $result = BlockAttributesRepository::save($post_id, $attributes['attributes']);

        if ($result) {
            // Get the saved attributes to return
            $saved_attributes = BlockAttributesRepository::get($post_id);

            return new WP_REST_Response([
                'success' => true,
                'data' => $saved_attributes,
                'message' => 'Attributes saved successfully'
            ], 200);
        }

        return new WP_REST_Response([
            'success' => false,
            'message' => 'Failed to save attributes'
        ], 500);
    }

    /**
     * Update a single attribute
     */
    public function updateAttribute(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = intval($request->get_param('post_id'));
        $attr_id = intval($request->get_param('attr_id'));
        $attribute = $request->get_json_params();

        // Add the ID to the attribute data
        $attribute['id'] = $attr_id;

        $result = BlockAttributesRepository::saveAttribute($post_id, $attribute);

        if ($result) {
            return new WP_REST_Response([
                'success' => true,
                'data' => ['id' => $result],
                'message' => 'Attribute updated successfully'
            ], 200);
        }

        return new WP_REST_Response([
            'success' => false,
            'message' => 'Failed to update attribute'
        ], 500);
    }

    /**
     * Delete a single attribute
     */
    public function deleteAttribute(WP_REST_Request $request): WP_REST_Response
    {
        $attr_id = intval($request->get_param('attr_id'));

        $result = BlockAttributesRepository::deleteAttribute($attr_id);

        if ($result) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Attribute deleted successfully'
            ], 200);
        }

        return new WP_REST_Response([
            'success' => false,
            'message' => 'Failed to delete attribute'
        ], 500);
    }

    /**
     * Delete all attributes for a block
     */
    public function deleteAllAttributes(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = intval($request->get_param('post_id'));

        $result = BlockAttributesRepository::delete($post_id);

        if ($result) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'All attributes deleted successfully'
            ], 200);
        }

        return new WP_REST_Response([
            'success' => false,
            'message' => 'Failed to delete attributes'
        ], 500);
    }

    /**
     * Get attributes for multiple blocks
     */
    public function getAttributesBulk(WP_REST_Request $request): WP_REST_Response
    {
        $params = $request->get_json_params();

        if (!isset($params['post_ids']) || !is_array($params['post_ids'])) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Invalid post_ids parameter'
            ], 400);
        }

        $post_ids = array_map('intval', $params['post_ids']);
        $attributes = BlockAttributesRepository::getMultiple($post_ids);

        return new WP_REST_Response([
            'success' => true,
            'data' => $attributes
        ], 200);
    }

    /**
     * Migrate attributes from post meta to database
     */
    public function migrateAttributes(WP_REST_Request $request): WP_REST_Response
    {
        $params = $request->get_json_params();

        if (isset($params['post_id'])) {
            // Migrate single post
            $post_id = intval($params['post_id']);
            $result = BlockAttributesRepository::migrateFromPostMeta($post_id);

            return new WP_REST_Response([
                'success' => $result,
                'message' => $result ? 'Migration completed' : 'Migration failed'
            ], $result ? 200 : 500);
        } else {
            // Migrate all posts
            $migrated = BlockAttributesRepository::migrateAll();

            return new WP_REST_Response([
                'success' => true,
                'data' => ['migrated' => $migrated],
                'message' => "Migrated $migrated blocks"
            ], 200);
        }
    }
}