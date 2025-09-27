<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Api\Services\ApiResponseFormatter;

class RegisteredBlocksApiController
{
    private $responseFormatter;
    public function __construct()
    {
        $this->responseFormatter = new ApiResponseFormatter();
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
        register_rest_route('funculo/v1', '/registered-blocks', [
            'methods' => 'GET',
            'callback' => [$this, 'getRegisteredBlocks'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);
    }

    public function checkPermissions()
    {
        return current_user_can('edit_posts');
    }

    public function getRegisteredBlocks()
    {
        $registry = \WP_Block_Type_Registry::get_instance();
        $registered_blocks = $registry->get_all_registered();

        $blocks_data = [];

        foreach ($registered_blocks as $block_name => $block_type) {
            $blocks_data[] = [
                'name' => $block_name,
                'title' => $block_type->title ?? $block_name,
                'description' => $block_type->description ?? '',
                'category' => $block_type->category ?? '',
                'icon' => $block_type->icon ?? '',
                'keywords' => $block_type->keywords ?? [],
                'supports' => $block_type->supports ?? [],
                'attributes' => $block_type->attributes ?? [],
                'parent' => $block_type->parent ?? [],
                'ancestor' => $block_type->ancestor ?? [],
                'uses_context' => $block_type->uses_context ?? [],
                'provides_context' => $block_type->provides_context ?? [],
                'is_dynamic' => !empty($block_type->render_callback),
                'editor_script' => $block_type->editor_script ?? '',
                'script' => $block_type->script ?? '',
                'editor_style' => $block_type->editor_style ?? '',
                'style' => $block_type->style ?? ''
            ];
        }

        return $this->responseFormatter->collection(
            $blocks_data,
            ['total' => count($blocks_data)]
        );
    }
}