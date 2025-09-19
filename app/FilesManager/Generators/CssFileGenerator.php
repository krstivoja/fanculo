<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class CssFileGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        // Try to get compiled CSS first
        $cssContent = get_post_meta($postId, MetaKeysConstants::CSS_CONTENT, true);

        // If no compiled CSS, fall back to SCSS content as CSS (basic fallback)
        if (empty($cssContent)) {
            $scssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true);
            if (!empty($scssContent)) {
                $cssContent = $scssContent;
            }
        }

        if (empty($cssContent)) {
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);


        return file_put_contents($filepath, $cssContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::CSS_CONTENT, MetaKeysConstants::BLOCK_SCSS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'style.css';
    }

    public function getFileExtension(): string
    {
        return 'css';
    }

    public function validate(int $postId): bool
    {
        // Check if we have either compiled CSS or SCSS content
        $cssContent = get_post_meta($postId, MetaKeysConstants::CSS_CONTENT, true);
        $scssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true);

        return !empty($cssContent) || !empty($scssContent);
    }
}