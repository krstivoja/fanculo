<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use WP_Post;

class BlockJsonGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $attributes = get_post_meta($postId, '_funculo_block_attributes', true);
        $settings = get_post_meta($postId, '_funculo_block_settings', true);

        $blockJson = $this->buildBlockJson($post, $attributes, $settings);
        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        error_log("BlockJsonGenerator: Writing block.json for {$post->post_name}");

        return file_put_contents($filepath, json_encode($blockJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return ['_funculo_block_attributes', '_funculo_block_settings'];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'block.json';
    }

    public function getFileExtension(): string
    {
        return 'json';
    }

    public function validate(int $postId): bool
    {
        return true; // block.json is always generated for blocks
    }

    private function buildBlockJson(WP_Post $post, $attributes, $settings): array
    {
        $blockJson = [
            '$schema' => 'https://schemas.wp.org/trunk/block.json',
            'apiVersion' => 3,
            'name' => 'fanculo/' . $post->post_name,
            'version' => '1.0.0',
            'title' => $post->post_title,
            'category' => 'theme',
            'icon' => 'smiley',
            'description' => '',
            'supports' => [
                'html' => false
            ],
            'textdomain' => 'fanculo-wp',
            'editorScript' => 'file:./index.js',
            // 'editorStyle' => 'file:./index.css',
            'style' => 'file:./style-index.css',
            'render' => 'file:./render.php',
            'viewScript' => 'file:./view.js'
        ];

        // Add attributes if available
        if (!empty($attributes)) {
            if (is_string($attributes)) {
                $decodedAttributes = json_decode($attributes, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $blockJson['attributes'] = $decodedAttributes;
                }
            } elseif (is_array($attributes)) {
                $blockJson['attributes'] = $attributes;
            }
        }

        // Add settings if available
        if (!empty($settings)) {
            if (is_string($settings)) {
                $decodedSettings = json_decode($settings, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $blockJson = array_merge($blockJson, $decodedSettings);
                }
            } elseif (is_array($settings)) {
                $blockJson = array_merge($blockJson, $settings);
            }
        }

        return $blockJson;
    }
}