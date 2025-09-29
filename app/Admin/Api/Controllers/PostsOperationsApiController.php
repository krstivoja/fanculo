<?php

namespace Fanculo\Admin\Api\Controllers;

use Fanculo\Content\FunculoPostType;
use Fanculo\FilesManager\FilesManagerService;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Database\BlockAttributesRepository;
use Fanculo\Database\BlockSettingsRepository;
use Fanculo\Database\ScssPartialsSettingsRepository;

/**
 * Posts Operations API Controller - Bulk Operations
 *
 * Handles complex operations including:
 * - Bulk operations orchestration
 * - Multi-step operations
 * - Background processing coordination
 */
class PostsOperationsApiController extends BaseApiController
{
    public function registerRoutes()
    {
        // Execute bulk operations
        register_rest_route('funculo/v1', '/operations/bulk', [
            'methods' => 'POST',
            'callback' => [$this, 'executeBulkOperations'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'operations' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param);
                    }
                ]
            ]
        ]);
    }

    public function executeBulkOperations($request)
    {
        $startTime = microtime(true);
        $operations = $request->get_param('operations');
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($operations),
        ];

        foreach ($operations as $index => $operation) {
            if (!isset($operation['type']) || !isset($operation['data'])) {
                $results['failed'][] = [
                    'index' => $index,
                    'error' => 'Operation must have type and data',
                ];
                continue;
            }

            try {
                $result = $this->executeOperation($operation['type'], $operation['data']);
                $results['successful'][] = [
                    'index' => $index,
                    'type' => $operation['type'],
                    'result' => $result,
                ];
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'type' => $operation['type'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('executeBulkOperations', $results['total'], $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
        ];

        return $this->responseFormatter->batch($results, $performanceData);
    }

    /**
     * Execute a single operation within bulk operations
     */
    private function executeOperation($type, $data)
    {
        switch ($type) {
            case 'get_post':
                if (!isset($data['id'])) {
                    throw new \Exception('Post ID required for get_post operation');
                }
                $postId = absint($data['id']);
                $post = get_post($postId);
                if (!$post) {
                    throw new \Exception('Post not found');
                }

                // Use standardized bulk pipeline for consistent data format
                $pipelineResult = $this->standardBulkPipeline->executeSinglePostPipeline($postId);
                $formatOptions = [
                    'applyDatabaseSettingsFormatting' => true,
                    'includeEditUrl' => false,
                    'includeDates' => true,
                ];

                return $this->standardBulkPipeline->formatPostData($post, $pipelineResult, $formatOptions);

            case 'get_posts_bulk':
                if (!isset($data['ids']) || !is_array($data['ids'])) {
                    throw new \Exception('Post IDs array required for get_posts_bulk operation');
                }
                $postIds = array_map('absint', array_filter($data['ids']));
                if (empty($postIds)) {
                    throw new \Exception('At least one valid post ID is required');
                }

                // Get posts using WP_Query (Step 1)
                $args = [
                    'post_type' => FunculoPostType::getPostType(),
                    'post_status' => 'any',
                    'post__in' => $postIds,
                    'posts_per_page' => count($postIds),
                ];
                $query = new \WP_Query($args);

                if (empty($query->posts)) {
                    return [];
                }

                // Execute standardized bulk pipeline (Steps 2-6)
                $pipelineResult = $this->standardBulkPipeline->executeBulkPipeline($postIds);

                // Format posts
                $formatOptions = [
                    'applyDatabaseSettingsFormatting' => true,
                    'includeEditUrl' => false,
                    'includeDates' => true,
                ];

                $posts = [];
                foreach ($query->posts as $post) {
                    $posts[] = $this->standardBulkPipeline->formatPostData($post, $pipelineResult, $formatOptions);
                }

                return $posts;

            case 'update_meta':
                if (!isset($data['post_id']) || !isset($data['meta'])) {
                    throw new \Exception('Post ID and meta data required for update_meta operation');
                }
                $this->updatePostMeta($data['post_id'], $data['meta']);
                return ['post_id' => $data['post_id'], 'updated' => true];

            case 'regenerate_files':
                if (!isset($data['post_id'])) {
                    throw new \Exception('Post ID required for regenerate_files operation');
                }
                $post = get_post($data['post_id']);
                if ($post) {
                    $filesManagerService = new FilesManagerService();
                    $filesManagerService->generateFilesOnPostSave($data['post_id'], $post, true);
                }
                return ['post_id' => $data['post_id'], 'regenerated' => true];

            default:
                throw new \Exception('Unknown operation type: ' . esc_html($type));
        }
    }

    /**
     * Update post meta data
     */
    private function updatePostMeta($postId, $metaData)
    {
        // Update blocks meta
        if (isset($metaData['blocks'])) {
            $blocks = $metaData['blocks'];
            if (isset($blocks['php'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_PHP, wp_unslash($blocks['php']));
            }
            if (isset($blocks['scss'])) {
                $scssContent = sanitize_textarea_field($blocks['scss']);
                update_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, $scssContent);
                // If SCSS content is empty, also clear compiled CSS
                if (empty($scssContent)) {
                    update_post_meta($postId, MetaKeysConstants::CSS_CONTENT, '');
                }
            }
            if (isset($blocks['editorScss'])) {
                $editorScssContent = sanitize_textarea_field($blocks['editorScss']);
                update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, $editorScssContent);
                // If editor SCSS content is empty, also clear compiled editor CSS
                if (empty($editorScssContent)) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, '');
                }
            }
            if (isset($blocks['js'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_JS, sanitize_textarea_field($blocks['js']));
            }
            if (isset($blocks['attributes'])) {
                $attributesJson = sanitize_textarea_field($blocks['attributes']);
                update_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, $attributesJson);
                // Also save to database table
                $attributesData = json_decode($attributesJson, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($attributesData)) {
                    BlockAttributesRepository::save($postId, $attributesData);
                }
            }

            // Save block settings to database table
            $dbSettings = [];
            // Parse block settings JSON
            if (isset($blocks['settings'])) {
                $settingsJson = sanitize_textarea_field($blocks['settings']);
                $settingsData = json_decode($settingsJson, true);
                if ($settingsData) {
                    $dbSettings['category'] = $settingsData['category'] ?? null;
                    $dbSettings['description'] = $settingsData['description'] ?? null;
                    $dbSettings['icon'] = $settingsData['icon'] ?? null;
                }
            }

            // Parse inner blocks settings JSON
            if (isset($blocks['inner_blocks_settings'])) {
                $innerBlocksJson = sanitize_textarea_field($blocks['inner_blocks_settings']);
                $innerBlocksData = json_decode($innerBlocksJson, true);
                if ($innerBlocksData) {
                    $dbSettings['supports_inner_blocks'] = $innerBlocksData['enabled'] ?? false;
                    $dbSettings['allowed_block_types'] = $innerBlocksData['allowed_blocks'] ?? [];
                    $dbSettings['template'] = $innerBlocksData['template'] ?? [];
                    $dbSettings['template_lock'] = $innerBlocksData['templateLock'] ?? null;
                }
            }

            // Parse selected partials JSON
            if (isset($blocks['selected_partials'])) {
                $partialsJson = sanitize_textarea_field($blocks['selected_partials']);
                $partialsData = json_decode($partialsJson, true);
                if ($partialsData) {
                    $dbSettings['selected_partials'] = $partialsData;
                }
            }

            // Parse editor selected partials JSON
            if (isset($blocks['editor_selected_partials'])) {
                $editorPartialsJson = sanitize_textarea_field($blocks['editor_selected_partials']);
                $editorPartialsData = json_decode($editorPartialsJson, true);
                if ($editorPartialsData) {
                    $dbSettings['editor_selected_partials'] = $editorPartialsData;
                }
            }

            // Save to database if we have settings to save
            if (!empty($dbSettings)) {
                BlockSettingsRepository::save($postId, $dbSettings);
            }
        }

        // Update symbols meta
        if (isset($metaData['symbols'])) {
            $symbols = $metaData['symbols'];
            if (isset($symbols['php'])) {
                update_post_meta($postId, MetaKeysConstants::SYMBOL_PHP, wp_unslash($symbols['php']));
            }
        }

        // Update SCSS partials meta
        if (isset($metaData['scss_partials'])) {
            $scssPartials = $metaData['scss_partials'];
            if (isset($scssPartials['scss'])) {
                update_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_CONTENT, sanitize_textarea_field($scssPartials['scss']));
            }

            // Handle global settings - save to database table
            $globalSettings = [];
            if (isset($scssPartials['is_global'])) {
                $isGlobal = $scssPartials['is_global'] === '1' || $scssPartials['is_global'] === true;
                $globalSettings['is_global'] = $isGlobal;
                update_post_meta($postId, MetaKeysConstants::SCSS_IS_GLOBAL, $isGlobal ? '1' : '0');
            }
            if (isset($scssPartials['global_order'])) {
                $order = intval($scssPartials['global_order']);
                $globalSettings['global_order'] = $order;
                update_post_meta($postId, MetaKeysConstants::SCSS_GLOBAL_ORDER, (string)$order);
            }

            // Save to database table
            if (!empty($globalSettings)) {
                ScssPartialsSettingsRepository::save($postId, $globalSettings);
            }
        }
    }
}