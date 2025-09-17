<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class StyleFileGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $scssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true);

        if (empty($scssContent)) {
            error_log("StyleFileGenerator: No SCSS content for post ID: $postId");
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("StyleFileGenerator: Writing style.scss for {$post->post_name}");

        return file_put_contents($filepath, $scssContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_SCSS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'style.scss';
    }

    public function getFileExtension(): string
    {
        return 'scss';
    }

    public function validate(int $postId): bool
    {
        $scssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true);
        return !empty($scssContent);
    }
}