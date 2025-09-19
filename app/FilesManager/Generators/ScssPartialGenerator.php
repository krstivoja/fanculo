<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class ScssPartialGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermScssPartials();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $scssContent = get_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, true);

        if (empty($scssContent)) {
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);


        return file_put_contents($filepath, $scssContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::SCSS_PARTIAL_SCSS];
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
        $scssContent = get_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, true);
        return !empty($scssContent);
    }
}