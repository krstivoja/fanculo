<?php

namespace Fanculo\FilesManager\Files;

use Fanculo\FilesManager\Interfaces\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class EditorStyle implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $editorScssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);

        if (empty($editorScssContent)) {
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        return file_put_contents($filepath, $editorScssContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_EDITOR_SCSS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'editor.scss';
    }

    public function getFileExtension(): string
    {
        return 'scss';
    }

    public function validate(int $postId): bool
    {
        $editorScssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);
        return !empty($editorScssContent);
    }
}