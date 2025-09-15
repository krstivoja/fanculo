<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use WP_Post;

class SymbolFileGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermSymbols();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $phpContent = get_post_meta($postId, '_funculo_symbol_php', true);

        if (empty($phpContent)) {
            error_log("SymbolFileGenerator: No PHP content for post ID: $postId");
            return false;
        }

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("SymbolFileGenerator: Writing symbol file for {$post->post_name}");

        return file_put_contents($filepath, $phpContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return ['_funculo_symbol_php'];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return $post->post_name . '.php';
    }

    public function getFileExtension(): string
    {
        return 'php';
    }

    public function validate(int $postId): bool
    {
        $phpContent = get_post_meta($postId, '_funculo_symbol_php', true);
        return !empty($phpContent);
    }
}