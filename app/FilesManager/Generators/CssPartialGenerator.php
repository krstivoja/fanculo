<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class CssPartialGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermScssPartials();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        // Try to get compiled CSS first
        $cssContent = get_post_meta($postId, MetaKeysConstants::CSS_CONTENT, true);

        // If no compiled CSS, fall back to SCSS content as CSS (basic fallback)
        if (empty($cssContent)) {
            $scssContent = get_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, true);
            if (!empty($scssContent)) {
                error_log("CssPartialGenerator: No compiled CSS found, using SCSS as fallback for post ID: $postId");
                $cssContent = $scssContent;
            }
        }

        if (empty($cssContent)) {
            error_log("CssPartialGenerator: No CSS or SCSS content for post ID: $postId");
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("CssPartialGenerator: Writing CSS partial for {$post->post_name}");

        return file_put_contents($filepath, $cssContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::CSS_CONTENT, MetaKeysConstants::SCSS_PARTIAL_SCSS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return $post->post_name . '.css';
    }

    public function getFileExtension(): string
    {
        return 'css';
    }

    public function validate(int $postId): bool
    {
        // Check if we have either compiled CSS or SCSS content
        $cssContent = get_post_meta($postId, MetaKeysConstants::CSS_CONTENT, true);
        $scssContent = get_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, true);

        return !empty($cssContent) || !empty($scssContent);
    }
}