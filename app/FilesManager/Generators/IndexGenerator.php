<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class IndexGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $settings = get_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, true);

        // Parse settings if it's a string
        $parsedSettings = [];
        if (!empty($settings)) {
            if (is_string($settings)) {
                $decodedSettings = json_decode($settings, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $parsedSettings = $decodedSettings;
                }
            } elseif (is_array($settings)) {
                $parsedSettings = $settings;
            }
        }

        return Index::generate($outputPath, $post->post_name, $parsedSettings);
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_SETTINGS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'index.js';
    }

    public function getFileExtension(): string
    {
        return 'js';
    }

    public function validate(int $postId): bool
    {
        return true; // index.js is always generated for blocks
    }
}