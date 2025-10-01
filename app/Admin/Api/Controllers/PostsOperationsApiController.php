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
                    'type' => 'array',
                    'required' => true,
                    'sanitize_callback' => function($value) {
                        return $this->sanitizeBulkOperations($value);
                    },
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 50;
                    }
                ]
            ]
        ]);
    }

    /**
     * Sanitize bulk operations array
     */
    private function sanitizeBulkOperations(array $operations): array
    {
        $sanitized = [];
        $max_operations = 50;
        $count = 0;

        foreach ($operations as $index => $operation) {
            if ($count >= $max_operations) {
                break;
            }

            if (!is_array($operation)) {
                continue;
            }

            $sanitized_op = [];

            // Sanitize operation type
            if (isset($operation['type'])) {
                $sanitized_op['type'] = $this->getSanitizationService()->sanitizeText($operation['type'], 'key');
            }

            // Sanitize operation data
            if (isset($operation['data']) && is_array($operation['data'])) {
                $sanitized_op['data'] = $this->sanitizeOperationData($operation['data'], $sanitized_op['type'] ?? '');
            }

            if (!empty($sanitized_op['type']) && !empty($sanitized_op['data'])) {
                $sanitized[] = $sanitized_op;
                $count++;
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize operation data based on operation type
     */
    private function sanitizeOperationData(array $data, string $operation_type): array
    {
        $service = $this->getSanitizationService();
        $sanitized = [];

        switch ($operation_type) {
            case 'get_post':
            case 'regenerate_files':
                if (isset($data['id'])) {
                    $sanitized['id'] = $service->sanitizeInteger($data['id'], 1);
                }
                break;

            case 'get_posts_bulk':
                if (isset($data['ids']) && is_array($data['ids'])) {
                    $sanitized['ids'] = array_filter(
                        array_map(function($id) use ($service) {
                            return $service->sanitizeInteger($id, 1);
                        }, $data['ids']),
                        function($id) { return $id > 0; }
                    );
                }
                break;

            case 'update_meta':
                if (isset($data['post_id'])) {
                    $sanitized['post_id'] = $service->sanitizeInteger($data['post_id'], 1);
                }
                if (isset($data['meta']) && is_array($data['meta'])) {
                    $sanitized['meta'] = $this->sanitizeNestedMeta($data['meta']);
                }
                break;

            default:
                // For unknown operation types, do basic array sanitization
                foreach ($data as $key => $value) {
                    $sanitized_key = $service->sanitizeText($key, 'key');
                    if (is_array($value)) {
                        $sanitized[$sanitized_key] = $service->sanitizeArray($value);
                    } else {
                        $sanitized[$sanitized_key] = $service->sanitizeText($value, 'textarea');
                    }
                }
        }

        return $sanitized;
    }

    public function executeBulkOperations($request)
    {
        $startTime = microtime(true);
        // Operations are already sanitized by route args
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
     * Update post meta data - data is already sanitized by sanitizeNestedMeta
     */
    private function updatePostMeta($postId, $metaData)
    {
        // Meta data is already sanitized at the request level

        // Update blocks meta
        if (isset($metaData['blocks'])) {
            $blocks = $metaData['blocks'];
            if (isset($blocks['php'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_PHP, $blocks['php']);
            }
            if (isset($blocks['scss'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, $blocks['scss']);
                // If SCSS content is empty, also clear compiled CSS
                if (empty($blocks['scss'])) {
                    update_post_meta($postId, MetaKeysConstants::CSS_CONTENT, '');
                }
            }
            if (isset($blocks['editorScss'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, $blocks['editorScss']);
                // If editor SCSS content is empty, also clear compiled editor CSS
                if (empty($blocks['editorScss'])) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, '');
                }
            }
            if (isset($blocks['js'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_JS, $blocks['js']);
            }
            if (isset($blocks['attributes'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, $blocks['attributes']);
                // Also save to database table
                $attributesData = json_decode($blocks['attributes'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($attributesData)) {
                    BlockAttributesRepository::save($postId, $attributesData);
                }
            }

            // Save block settings to database table
            $dbSettings = [];
            // Parse block settings JSON (already sanitized)
            if (isset($blocks['settings'])) {
                $settingsData = json_decode($blocks['settings'], true);
                if ($settingsData) {
                    $dbSettings['category'] = $settingsData['category'] ?? null;
                    $dbSettings['description'] = $settingsData['description'] ?? null;
                    $dbSettings['icon'] = $settingsData['icon'] ?? null;
                }
            }

            // Parse inner blocks settings JSON (already sanitized)
            if (isset($blocks['inner_blocks_settings'])) {
                $innerBlocksData = json_decode($blocks['inner_blocks_settings'], true);
                if ($innerBlocksData) {
                    $dbSettings['supports_inner_blocks'] = $innerBlocksData['enabled'] ?? false;
                    $dbSettings['allowed_block_types'] = $innerBlocksData['allowed_blocks'] ?? [];
                    $dbSettings['template'] = $innerBlocksData['template'] ?? [];
                    $dbSettings['template_lock'] = $innerBlocksData['templateLock'] ?? null;
                }
            }

            // Parse selected partials JSON (already sanitized)
            // Support both snake_case and camelCase keys
            $selectedPartialsKey = isset($blocks['selectedPartials']) ? 'selectedPartials' : 'selected_partials';
            if (isset($blocks[$selectedPartialsKey])) {
                $partialsData = json_decode($blocks[$selectedPartialsKey], true);
                // Allow empty arrays - user may have removed all partials
                if (is_array($partialsData)) {
                    $dbSettings['selected_partials'] = $partialsData;
                }
            }

            // Parse editor selected partials JSON (already sanitized)
            // Support both snake_case and camelCase keys
            $editorSelectedPartialsKey = isset($blocks['editorSelectedPartials']) ? 'editorSelectedPartials' : 'editor_selected_partials';
            if (isset($blocks[$editorSelectedPartialsKey])) {
                $editorPartialsData = json_decode($blocks[$editorSelectedPartialsKey], true);
                // Allow empty arrays - user may have removed all partials
                if (is_array($editorPartialsData)) {
                    $dbSettings['editor_selected_partials'] = $editorPartialsData;
                }
            }

            // Save to database if we have settings to save
            if (!empty($dbSettings)) {
                BlockSettingsRepository::save($postId, $dbSettings);
            }
        }

        // Update symbols meta (already sanitized)
        if (isset($metaData['symbols'])) {
            $symbols = $metaData['symbols'];
            if (isset($symbols['php'])) {
                update_post_meta($postId, MetaKeysConstants::SYMBOL_PHP, $symbols['php']);
            }
        }

        // Update SCSS partials meta (already sanitized)
        if (isset($metaData['scss_partials'])) {
            $scssPartials = $metaData['scss_partials'];
            if (isset($scssPartials['scss'])) {
                update_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, $scssPartials['scss']);
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

        // Trigger file generation after meta data update
        error_log("Fanculo Debug: Triggering file generation after meta update for post ID: $postId");
        $post = get_post($postId);
        if ($post) {
            $filesManagerService = new FilesManagerService();
            $result = $filesManagerService->generateFilesOnPostSave($postId, $post, true);
            error_log("Fanculo Debug: File generation result: " . print_r($result, true));
        } else {
            error_log("Fanculo Debug: Could not find post with ID: $postId");
        }
    }
}