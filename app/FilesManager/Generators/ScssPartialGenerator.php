<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use WP_Post;

class ScssPartialGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermScssPartials();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $scssContent = get_post_meta($postId, '_funculo_scss_partial_scss', true);

        if (empty($scssContent)) {
            error_log("ScssPartialGenerator: No SCSS content for post ID: $postId");
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("ScssPartialGenerator: Writing SCSS partial for {$post->post_name}");

        return file_put_contents($filepath, $scssContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return ['_funculo_scss_partial_scss'];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return $post->post_name . '.scss';
    }

    public function getFileExtension(): string
    {
        return 'scss';
    }

    public function validate(int $postId): bool
    {
        $scssContent = get_post_meta($postId, '_funculo_scss_partial_scss', true);
        return !empty($scssContent);
    }
}