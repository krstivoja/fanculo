<?php

namespace FanCoolo\FilesManager\Files;

use FanCoolo\FilesManager\Interfaces\FileGeneratorInterface;
use FanCoolo\Content\FunculoTypeTaxonomy;
use FanCoolo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class ViewJS implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $jsContent = get_post_meta($postId, MetaKeysConstants::BLOCK_JS, true);
        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        // If content is empty, delete existing file
        if (empty($jsContent)) {
            if (file_exists($filepath)) {
                return unlink($filepath);
            }
            return true;
        }

        return file_put_contents($filepath, $jsContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_JS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'view.js';
    }

    public function getFileExtension(): string
    {
        return 'js';
    }

    public function validate(int $postId): bool
    {
        // Always return true so generator can run to either create or delete files
        return true;
    }
}