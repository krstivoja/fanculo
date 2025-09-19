<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class RenderFileGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $phpContent = get_post_meta($postId, MetaKeysConstants::BLOCK_PHP, true);

        if (empty($phpContent)) {
            error_log("RenderFileGenerator: No PHP content for post ID: $postId");
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("RenderFileGenerator: Writing render.php for {$post->post_name}");

        return file_put_contents($filepath, $phpContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_PHP];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'render.php';
    }

    public function getFileExtension(): string
    {
        return 'php';
    }

    public function validate(int $postId): bool
    {
        $phpContent = get_post_meta($postId, MetaKeysConstants::BLOCK_PHP, true);
        return !empty($phpContent);
    }
}