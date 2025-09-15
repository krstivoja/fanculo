<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use WP_Post;

class ViewFileGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $jsContent = get_post_meta($postId, '_funculo_block_js', true);

        if (empty($jsContent)) {
            error_log("ViewFileGenerator: No JS content for post ID: $postId");
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("ViewFileGenerator: Writing view.js for {$post->post_name}");

        return file_put_contents($filepath, $jsContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return ['_funculo_block_js'];
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
        $jsContent = get_post_meta($postId, '_funculo_block_js', true);
        return !empty($jsContent);
    }
}