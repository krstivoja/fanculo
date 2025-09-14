<?php

namespace Fanculo\Services;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;

class FileGenerationService
{
    private $baseDir;
    private $wpContentPath;

    public function __construct()
    {
        $this->wpContentPath = WP_CONTENT_DIR;
        $this->baseDir = $this->wpContentPath . '/plugins/fanculo-blocks';
    }

    public function generateFilesOnPostSave($postId, $post, $update)
    {
        // Debug logging
        error_log("FileGeneration: Processing post save for ID: $postId, type: {$post->post_type}, triggering full regeneration");

        // Only process our post type
        if ($post->post_type !== FunculoPostType::getPostType()) {
            error_log("FileGeneration: Skipping - wrong post type: {$post->post_type}");
            return;
        }

        // Regenerate ALL files whenever any Funculo post is saved
        $this->regenerateAllFiles();
    }

    public function handlePostRename($postId, $postAfter, $postBefore)
    {
        // Only process our post type
        if ($postAfter->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        // Check if slug changed
        if ($postBefore->post_name === $postAfter->post_name) {
            return;
        }

        error_log("FileGeneration: Post renamed from '{$postBefore->post_name}' to '{$postAfter->post_name}', triggering full regeneration");

        // Regenerate all files to ensure consistency
        $this->regenerateAllFiles();
    }

    public function handlePostDeletion($postId)
    {
        $post = get_post($postId);
        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        error_log("FileGeneration: Post deleted (ID: $postId, slug: {$post->post_name}), triggering full regeneration");

        // Regenerate all files to remove deleted post's files
        $this->regenerateAllFiles();
    }

    private function ensureBaseDirectoryExists()
    {
        error_log("FileGeneration: Checking base directory: {$this->baseDir}");

        if (!file_exists($this->baseDir)) {
            error_log("FileGeneration: Creating base directory: {$this->baseDir}");
            $result = wp_mkdir_p($this->baseDir);
            error_log("FileGeneration: Base directory creation result: " . ($result ? 'success' : 'failed'));
        } else {
            error_log("FileGeneration: Base directory already exists");
        }
    }

    private function ensureSubdirectoryExists($subdirName)
    {
        $path = $this->baseDir . '/' . $subdirName;
        if (!file_exists($path)) {
            error_log("FileGeneration: Creating subdirectory: $path");
            $result = wp_mkdir_p($path);
            error_log("FileGeneration: Subdirectory creation result: " . ($result ? 'success' : 'failed'));
        }
        return $path;
    }

    private function generateBlockFiles($postId, $post)
    {
        $slug = $post->post_name;
        $blockDir = $this->baseDir . '/' . $slug;

        error_log("FileGeneration: Generating block files for slug: $slug in directory: $blockDir");

        // Create block directory
        if (!file_exists($blockDir)) {
            error_log("FileGeneration: Creating block directory: $blockDir");
            $result = wp_mkdir_p($blockDir);
            error_log("FileGeneration: Block directory creation result: " . ($result ? 'success' : 'failed'));
        }

        // Get meta data
        $phpContent = get_post_meta($postId, '_funculo_block_php', true);
        $scssContent = get_post_meta($postId, '_funculo_block_scss', true);
        $jsContent = get_post_meta($postId, '_funculo_block_js', true);
        $attributes = get_post_meta($postId, '_funculo_block_attributes', true);
        $settings = get_post_meta($postId, '_funculo_block_settings', true);

        error_log("FileGeneration: Meta data lengths - PHP: " . strlen($phpContent) . ", SCSS: " . strlen($scssContent) . ", JS: " . strlen($jsContent));

        // Generate render.php
        if (!empty($phpContent)) {
            $this->writeFile($blockDir . '/render.php', $phpContent);
        }

        // Generate style.scss
        if (!empty($scssContent)) {
            $this->writeFile($blockDir . '/style.scss', $scssContent);
        }

        // Generate view.js
        if (!empty($jsContent)) {
            $this->writeFile($blockDir . '/view.js', $jsContent);
        }

        // Generate block.json
        $this->generateBlockJson($blockDir, $post, $attributes, $settings);
    }

    private function generateSymbolFile($postId, $post)
    {
        $slug = $post->post_name;

        error_log("FileGeneration: Generating symbol file for slug: $slug");

        // Get PHP content
        $phpContent = get_post_meta($postId, '_funculo_symbol_php', true);

        error_log("FileGeneration: Symbol PHP content length: " . strlen($phpContent));

        if (!empty($phpContent)) {
            // Only create the symbols directory when we actually need it
            $symbolsDir = $this->ensureSubdirectoryExists('symbols');
            $filename = $symbolsDir . '/' . $slug . '.php';

            error_log("FileGeneration: Writing symbol file: $filename");
            $this->writeFile($filename, $phpContent);
        } else {
            error_log("FileGeneration: No PHP content for symbol, skipping file creation");
        }
    }

    private function generateScssPartialFile($postId, $post)
    {
        $slug = $post->post_name;

        error_log("FileGeneration: Generating SCSS partial file for slug: $slug");

        // Get SCSS content
        $scssContent = get_post_meta($postId, '_funculo_scss_partial_scss', true);

        error_log("FileGeneration: SCSS content length: " . strlen($scssContent));

        if (!empty($scssContent)) {
            // Only create the scss directory when we actually need it
            $scssDir = $this->ensureSubdirectoryExists('scss');
            $filename = $scssDir . '/' . $slug . '.scss';

            error_log("FileGeneration: Writing SCSS file: $filename");
            $this->writeFile($filename, $scssContent);
        } else {
            error_log("FileGeneration: No SCSS content for partial, skipping file creation");
        }
    }

    private function generateBlockJson($blockDir, $post, $attributes, $settings)
    {
        // Basic block.json structure
        $blockJson = [
            'apiVersion' => 2,
            'name' => 'fanculo/' . $post->post_name,
            'title' => $post->post_title,
            'category' => 'theme',
            'icon' => 'smiley',
            'description' => '',
            'supports' => [
                'html' => false
            ],
            'textdomain' => 'fanculo-wp',
            'editorScript' => 'file:./index.js',
            'editorStyle' => 'file:./index.css',
            'style' => 'file:./style-index.css'
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

        $this->writeFile($blockDir . '/block.json', json_encode($blockJson, JSON_PRETTY_PRINT));
    }


    private function writeFile($filepath, $content)
    {
        $directory = dirname($filepath);
        if (!file_exists($directory)) {
            wp_mkdir_p($directory);
        }

        file_put_contents($filepath, $content);
    }

    private function deleteDirectory($dir)
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $filepath = $dir . '/' . $file;
            if (is_dir($filepath)) {
                $this->deleteDirectory($filepath);
            } else {
                unlink($filepath);
            }
        }
        rmdir($dir);
    }

    public function regenerateAllFiles()
    {
        error_log("FileGeneration: Starting full regeneration of all files");

        // Clean up existing files first
        $this->cleanupAllFiles();

        // Get all funculo posts
        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1
        ]);

        error_log("FileGeneration: Found " . count($posts) . " posts to process");

        if (empty($posts)) {
            error_log("FileGeneration: No posts found, skipping file generation");
            return;
        }

        // Ensure base directory exists
        $this->ensureBaseDirectoryExists();

        // Process each post
        foreach ($posts as $post) {
            $this->generateFilesForSinglePost($post->ID, $post);
        }

        error_log("FileGeneration: Full regeneration completed");
    }

    private function generateFilesForSinglePost($postId, $post)
    {
        // Get the taxonomy terms for this post
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());
        if (empty($terms) || is_wp_error($terms)) {
            return;
        }

        foreach ($terms as $term) {
            switch ($term->slug) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    $this->generateBlockFiles($postId, $post);
                    break;
                case FunculoTypeTaxonomy::getTermSymbols():
                    $this->generateSymbolFile($postId, $post);
                    break;
                case FunculoTypeTaxonomy::getTermScssPartials():
                    $this->generateScssPartialFile($postId, $post);
                    break;
            }
        }
    }

    private function cleanupAllFiles()
    {
        error_log("FileGeneration: Cleaning up existing files");

        if (file_exists($this->baseDir)) {
            // Remove all existing files and directories
            $this->deleteDirectory($this->baseDir);
        }
    }

    public function debugTest()
    {
        error_log("FileGeneration: Debug test started");
        error_log("FileGeneration: Base dir: {$this->baseDir}");
        error_log("FileGeneration: WP_CONTENT_DIR: " . WP_CONTENT_DIR);

        // Test directory creation
        $this->ensureBaseDirectoryExists();

        // Check if directory was created
        if (file_exists($this->baseDir)) {
            error_log("FileGeneration: Base directory exists after creation");
        } else {
            error_log("FileGeneration: Base directory NOT created");
        }

        return "Debug test completed - check error logs";
    }
}