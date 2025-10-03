<?php

namespace FanCoolo\Admin\Api;

use FanCoolo\Database\BlockAttributesRepository;
use FanCoolo\Admin\Api\Services\ApiResponseFormatter;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * REST API controller for block attributes
 */
class BlockAttributesApiController
{
    private $responseFormatter;
    public function __construct()
    {
        $this->responseFormatter = new ApiResponseFormatter();
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    /**
     * Register API routes
     */
    public function registerRoutes(): void
    {
        // Use simpler route pattern that works
        register_rest_route('fancoolo/v1', '/block-attributes/(?P<post_id>\d+)', [
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
        register_rest_route('fancoolo/v1', '/blocks/(?P<post_id>\d+)/attributes', [
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

        // Single attribute operations
        register_rest_route('fancoolo/v1', '/blocks/(?P<post_id>\d+)/attributes/(?P<attr_id>\d+)', [
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
        register_rest_route('fancoolo/v1', '/blocks/attributes/bulk', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'getAttributesBulk'],
                'permission_callback' => [$this, 'checkPermission']
            ]
        ]);

        // Migration endpoint
        register_rest_route('fancoolo/v1', '/blocks/attributes/migrate', [
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
            return $this->responseFormatter->notFound('Post', $post_id);
        }

        $attributes = BlockAttributesRepository::get($post_id);

        return $this->responseFormatter->success($attributes);
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
            return $this->responseFormatter->notFound('Post', $post_id);
        }

        // Validate attributes array
        if (!isset($attributes['attributes']) || !is_array($attributes['attributes'])) {
            return $this->responseFormatter->validationError(
                ['attributes' => 'Invalid attributes data']
            );
        }

        // Validate each attribute
        foreach ($attributes['attributes'] as $attr) {
            if (empty($attr['name']) || empty($attr['type'])) {
                return $this->responseFormatter->validationError(
                    ['attributes' => 'Each attribute must have a name and type']
                );
            }
        }

        $result = BlockAttributesRepository::save($post_id, $attributes['attributes']);

        if ($result) {
            // Get the saved attributes to return
            $saved_attributes = BlockAttributesRepository::get($post_id);

            return $this->responseFormatter->updated(
                $saved_attributes,
                ['message' => 'Attributes saved successfully']
            );
        }

        return $this->responseFormatter->serverError('Failed to save attributes');
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
            return $this->responseFormatter->updated(
                ['id' => $result],
                ['message' => 'Attribute updated successfully']
            );
        }

        return $this->responseFormatter->serverError('Failed to update attribute');
    }

    /**
     * Delete a single attribute
     */
    public function deleteAttribute(WP_REST_Request $request): WP_REST_Response
    {
        $attr_id = intval($request->get_param('attr_id'));

        $result = BlockAttributesRepository::deleteAttribute($attr_id);

        if ($result) {
            return $this->responseFormatter->deleted('Attribute deleted successfully');
        }

        return $this->responseFormatter->serverError('Failed to delete attribute');
    }

    /**
     * Delete all attributes for a block
     */
    public function deleteAllAttributes(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = intval($request->get_param('post_id'));

        $result = BlockAttributesRepository::delete($post_id);

        if ($result) {
            return $this->responseFormatter->deleted('All attributes deleted successfully');
        }

        return $this->responseFormatter->serverError('Failed to delete attributes');
    }

    /**
     * Get attributes for multiple blocks
     */
    public function getAttributesBulk(WP_REST_Request $request): WP_REST_Response
    {
        $params = $request->get_json_params();

        if (!isset($params['post_ids']) || !is_array($params['post_ids'])) {
            return $this->responseFormatter->validationError(
                ['post_ids' => 'Invalid post_ids parameter']
            );
        }

        $post_ids = array_map('intval', $params['post_ids']);
        $attributes = BlockAttributesRepository::getMultiple($post_ids);

        return $this->responseFormatter->success($attributes);
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

            if ($result) {
                return $this->responseFormatter->success(
                    ['post_id' => $post_id],
                    ['message' => 'Migration completed']
                );
            } else {
                return $this->responseFormatter->serverError('Migration failed');
            }
        } else {
            // Migrate all posts
            $migrated = BlockAttributesRepository::migrateAll();

            return $this->responseFormatter->success(
                ['migrated' => $migrated],
                ['message' => "Migrated $migrated blocks"]
            );
        }
    }
}