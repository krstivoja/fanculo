<?php

namespace Fanculo\FilesManager\Files;

use Fanculo\FilesManager\Interfaces\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
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

        if (empty($jsContent)) {
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);


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
        $jsContent = get_post_meta($postId, MetaKeysConstants::BLOCK_JS, true);
        return !empty($jsContent);
    }
}