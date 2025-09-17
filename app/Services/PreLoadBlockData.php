<?php

namespace Fanculo\Services;

use Fanculo\FilesManager\Services\BlockLoader;

class PreLoadBlockData
{
    private $blockLoader;
    private $preRenderedData = [];

    public function __construct()
    {
        $this->blockLoader = new BlockLoader();
        $this->init();
    }

    private function init(): void
    {
        // Pre-render blocks VERY early - before Gutenberg loads
        add_action('admin_init', [$this, 'preRenderAllBlockData'], 1);

        // Inject pre-rendered data into editor page
        add_action('admin_enqueue_scripts', [$this, 'injectPreRenderedData'], 1);

        // Clear cache when needed
        add_action('save_post', [$this, 'clearPreRenderedCache']);
    }

    /**
     * Pre-render ALL possible block variations before Gutenberg loads
     * This runs during admin_init - before any editor JavaScript is loaded
     */
    public function preRenderAllBlockData(): void
    {
        // Only run on editor pages
        if (!$this->isEditorPage()) {
            return;
        }

        $startTime = microtime(true);

        // Check if we have cached data
        $cacheKey = $this->getCacheKey();
        $cached = get_transient($cacheKey);

        if ($cached && $this->isCacheValid($cached)) {
            $this->preRenderedData = $cached['data'];
            error_log('PreLoadBlockData: Using cached data (' . count($this->preRenderedData) . ' blocks)');
            return;
        }

        error_log('PreLoadBlockData: Pre-rendering all block data...');

        // Get all Fanculo blocks
        $fanculoBlocks = $this->getFanculoBlocks();

        foreach ($fanculoBlocks as $blockName => $blockType) {
            $this->preRenderedData[$blockName] = $this->preRenderBlockVariations($blockName, $blockType);
        }

        // Cache the pre-rendered data
        set_transient($cacheKey, [
            'timestamp' => time(),
            'post_id' => $this->getCurrentPostId(),
            'data' => $this->preRenderedData
        ], HOUR_IN_SECONDS);

        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000, 2);

        error_log("PreLoadBlockData: Pre-rendered " . count($fanculoBlocks) . " blocks in {$duration}ms");
    }

    /**
     * Pre-render multiple variations of a single block
     */
    private function preRenderBlockVariations(string $blockName, $blockType): array
    {
        $variations = [];

        try {
            // Get default attributes
            $defaultAttrs = $this->getDefaultAttributes($blockType);

            // 1. Default variation (most common)
            $variations['default'] = $this->renderSingleBlock($blockName, $defaultAttrs);

            // 2. Empty attributes variation
            $variations['empty'] = $this->renderSingleBlock($blockName, []);

            // 3. Generate common attribute variations
            if (isset($blockType->attributes)) {
                foreach ($blockType->attributes as $attrKey => $attrConfig) {
                    $this->generateAttributeVariations($blockName, $attrKey, $attrConfig, $defaultAttrs, $variations);
                }
            }

            // 4. Common UI patterns
            $this->generateCommonUIVariations($blockName, $defaultAttrs, $variations);

        } catch (Exception $e) {
            error_log("PreLoadBlockData: Error pre-rendering {$blockName}: " . $e->getMessage());
            $variations['default'] = '<div><!-- Pre-render error --></div>';
        }

        return $variations;
    }

    /**
     * Generate variations for a specific attribute
     */
    private function generateAttributeVariations(string $blockName, string $attrKey, array $attrConfig, array $baseAttrs, array &$variations): void
    {
        $type = $attrConfig['type'] ?? 'string';

        switch ($type) {
            case 'string':
                if (isset($attrConfig['enum'])) {
                    // Pre-render all enum values
                    foreach ($attrConfig['enum'] as $enumValue) {
                        $attrs = array_merge($baseAttrs, [$attrKey => $enumValue]);
                        $variations["{$attrKey}_{$enumValue}"] = $this->renderSingleBlock($blockName, $attrs);
                    }
                } else {
                    // Common string variations
                    $commonValues = [
                        'Sample Title',
                        'Example Content',
                        'Demo Text',
                        'Test Block',
                        ''
                    ];

                    foreach ($commonValues as $value) {
                        $attrs = array_merge($baseAttrs, [$attrKey => $value]);
                        $key = $value === '' ? "{$attrKey}_empty" : "{$attrKey}_" . sanitize_key($value);
                        $variations[$key] = $this->renderSingleBlock($blockName, $attrs);
                    }
                }
                break;

            case 'number':
                $min = $attrConfig['minimum'] ?? 0;
                $max = $attrConfig['maximum'] ?? 100;
                $default = $attrConfig['default'] ?? $min;

                // Pre-render key number values
                $values = [
                    $min,
                    $default,
                    $max,
                    round(($min + $max) / 2), // middle
                    round($min + ($max - $min) * 0.25), // quarter
                    round($min + ($max - $min) * 0.75)  // three-quarter
                ];

                foreach (array_unique($values) as $value) {
                    $attrs = array_merge($baseAttrs, [$attrKey => $value]);
                    $variations["{$attrKey}_{$value}"] = $this->renderSingleBlock($blockName, $attrs);
                }
                break;

            case 'boolean':
                // Pre-render both true and false
                foreach ([true, false] as $value) {
                    $attrs = array_merge($baseAttrs, [$attrKey => $value]);
                    $variations["{$attrKey}_" . ($value ? 'true' : 'false')] = $this->renderSingleBlock($blockName, $attrs);
                }
                break;
        }
    }

    /**
     * Generate common UI pattern variations
     */
    private function generateCommonUIVariations(string $blockName, array $baseAttrs, array &$variations): void
    {
        // Common color combinations
        $colorCombos = [
            ['textColor' => '#000000', 'backgroundColor' => '#ffffff'],
            ['textColor' => '#ffffff', 'backgroundColor' => '#000000'],
            ['textColor' => '#333333', 'backgroundColor' => '#f8f9fa'],
            ['textColor' => '#0073aa', 'backgroundColor' => '#ffffff'],
        ];

        foreach ($colorCombos as $index => $colors) {
            $attrs = array_merge($baseAttrs, $colors);
            $variations["colors_{$index}"] = $this->renderSingleBlock($blockName, $attrs);
        }

        // Common font sizes
        $fontSizes = [12, 16, 18, 24, 32, 48];
        foreach ($fontSizes as $size) {
            $attrs = array_merge($baseAttrs, ['fontSize' => $size]);
            $variations["fontSize_{$size}"] = $this->renderSingleBlock($blockName, $attrs);
        }
    }

    /**
     * Render a single block with given attributes
     */
    private function renderSingleBlock(string $blockName, array $attributes): string
    {
        try {
            $blockType = \WP_Block_Type_Registry::get_instance()->get_registered($blockName);

            if (!$blockType || !$blockType->render_callback) {
                return '<div><!-- No render callback --></div>';
            }

            // Create mock block object
            $block = new \WP_Block([
                'blockName' => $blockName,
                'attrs' => $attributes,
                'innerHTML' => '',
                'innerContent' => []
            ]);

            // Render the block
            $rendered = call_user_func($blockType->render_callback, $attributes, '', $block);

            return $rendered ?: '<div><!-- Empty render --></div>';

        } catch (Exception $e) {
            error_log("PreLoadBlockData: Render error for {$blockName}: " . $e->getMessage());
            return '<div><!-- Render error --></div>';
        }
    }

    /**
     * Inject pre-rendered data into the editor page
     */
    public function injectPreRenderedData(): void
    {
        // Only inject on editor pages
        if (!$this->isEditorPage()) {
            return;
        }

        // Prepare data for JavaScript
        $dataForJS = [
            'timestamp' => time(),
            'blocks' => $this->preRenderedData,
            'postId' => $this->getCurrentPostId(),
            'count' => count($this->preRenderedData)
        ];

        // Inject before any other scripts
        wp_add_inline_script('wp-blocks',
            'window.FunculoPreloadedData = ' . wp_json_encode($dataForJS) . ';' .
            'console.log("🚀 Fanculo Pre-loaded " + ' . count($this->preRenderedData) . ' + " blocks before Gutenberg loaded");',
            'before'
        );

        error_log('PreLoadBlockData: Injected ' . count($this->preRenderedData) . ' blocks into editor');
    }

    /**
     * Get all Fanculo blocks
     */
    private function getFanculoBlocks(): array
    {
        $allBlocks = \WP_Block_Type_Registry::get_instance()->get_all_registered();

        return array_filter($allBlocks, function($blockName) {
            return strpos($blockName, 'fanculo/') === 0;
        }, ARRAY_FILTER_USE_KEY);
    }

    /**
     * Get default attributes for a block type
     */
    private function getDefaultAttributes($blockType): array
    {
        $defaults = [];

        if (isset($blockType->attributes)) {
            foreach ($blockType->attributes as $attrKey => $attrConfig) {
                if (isset($attrConfig['default'])) {
                    $defaults[$attrKey] = $attrConfig['default'];
                }
            }
        }

        return $defaults;
    }

    /**
     * Check if we're on an editor page
     */
    private function isEditorPage(): bool
    {
        global $pagenow;

        return is_admin() &&
               in_array($pagenow, ['post.php', 'post-new.php']) &&
               (!defined('DOING_AJAX') || !DOING_AJAX);
    }

    /**
     * Get current post ID
     */
    private function getCurrentPostId(): int
    {
        global $post;

        if (isset($_GET['post'])) {
            return (int) $_GET['post'];
        }

        return $post->ID ?? 0;
    }

    /**
     * Get cache key for current context
     */
    private function getCacheKey(): string
    {
        $postId = $this->getCurrentPostId();
        return "fanculo_preload_data_{$postId}";
    }

    /**
     * Check if cached data is still valid
     */
    private function isCacheValid(array $cached): bool
    {
        // Cache valid for 30 minutes
        $maxAge = 30 * MINUTE_IN_SECONDS;
        $age = time() - ($cached['timestamp'] ?? 0);

        return $age < $maxAge;
    }

    /**
     * Clear pre-rendered cache
     */
    public function clearPreRenderedCache(): void
    {
        $postId = $this->getCurrentPostId();
        delete_transient("fanculo_preload_data_{$postId}");
        error_log('PreLoadBlockData: Cache cleared for post ' . $postId);
    }

    /**
     * Get statistics about pre-loaded data
     */
    public function getStats(): array
    {
        $totalVariations = 0;
        foreach ($this->preRenderedData as $blockVariations) {
            $totalVariations += count($blockVariations);
        }

        return [
            'blocks' => count($this->preRenderedData),
            'variations' => $totalVariations,
            'data_size' => strlen(serialize($this->preRenderedData))
        ];
    }
}