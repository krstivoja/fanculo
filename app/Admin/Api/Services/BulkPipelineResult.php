<?php

namespace FanCoolo\Admin\Api\Services;

/**
 * Bulk Pipeline Result Container
 *
 * Encapsulates the results from the standardized bulk operations pipeline
 */
class BulkPipelineResult
{
    /** @var array Terms data indexed by post_id */
    public $allTerms;

    /** @var array Meta data indexed by post_id */
    public $allMeta;

    /** @var array Block settings indexed by post_id */
    public $blockSettings;

    /** @var array SCSS settings indexed by post_id */
    public $scssSettings;

    /** @var array Block attributes indexed by post_id */
    public $blockAttributes;

    /** @var array Content type categorization */
    public $contentTypeIds;

    public function __construct(
        array $allTerms = [],
        array $allMeta = [],
        array $blockSettings = [],
        array $scssSettings = [],
        array $blockAttributes = [],
        array $contentTypeIds = []
    ) {
        $this->allTerms = $allTerms;
        $this->allMeta = $allMeta;
        $this->blockSettings = $blockSettings;
        $this->scssSettings = $scssSettings;
        $this->blockAttributes = $blockAttributes;
        $this->contentTypeIds = $contentTypeIds;
    }

    /**
     * Check if a post is a block
     */
    public function isBlock(int $postId): bool
    {
        return in_array($postId, $this->contentTypeIds['blocks'] ?? []);
    }

    /**
     * Check if a post is an SCSS partial
     */
    public function isScssPartial(int $postId): bool
    {
        return in_array($postId, $this->contentTypeIds['scssPartials'] ?? []);
    }

    /**
     * Check if a post is a symbol
     */
    public function isSymbol(int $postId): bool
    {
        return in_array($postId, $this->contentTypeIds['symbols'] ?? []);
    }

    /**
     * Get all data for a specific post
     */
    public function getPostData(int $postId): array
    {
        return [
            'terms' => $this->allTerms[$postId] ?? [],
            'meta' => $this->allMeta[$postId] ?? [],
            'block_settings' => $this->blockSettings[$postId] ?? null,
            'scss_settings' => $this->scssSettings[$postId] ?? null,
            'attributes' => $this->blockAttributes[$postId] ?? [],
            'content_type' => $this->getContentType($postId),
        ];
    }

    /**
     * Get the primary content type for a post
     */
    public function getContentType(int $postId): string
    {
        if ($this->isBlock($postId)) {
            return 'block';
        }
        if ($this->isScssPartial($postId)) {
            return 'scss-partial';
        }
        if ($this->isSymbol($postId)) {
            return 'symbol';
        }
        return 'unknown';
    }

    /**
     * Get performance statistics
     */
    public function getStats(): array
    {
        return [
            'total_posts' => count(array_unique(array_merge(
                array_keys($this->allTerms),
                array_keys($this->allMeta)
            ))),
            'blocks_count' => count($this->contentTypeIds['blocks'] ?? []),
            'scss_partials_count' => count($this->contentTypeIds['scssPartials'] ?? []),
            'symbols_count' => count($this->contentTypeIds['symbols'] ?? []),
            'block_settings_loaded' => count($this->blockSettings),
            'scss_settings_loaded' => count($this->scssSettings),
            'block_attributes_loaded' => count($this->blockAttributes),
        ];
    }
}