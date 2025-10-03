<?php

namespace FanCoolo\FilesManager\Services;

use FanCoolo\FilesManager\Files\IndexAssets;

class DirectoryManager
{
    private $baseDir;

    public function __construct()
    {
        $this->baseDir = WP_CONTENT_DIR . '/plugins/fancoolo-blocks';
    }

    public function ensureBaseDirectoryExists(): bool
    {

        if (!file_exists($this->baseDir)) {
            $result = wp_mkdir_p($this->baseDir);
            return $result;
        }

        return true;
    }

    public function ensureSubdirectoryExists(string $subdirName): string
    {
        $path = $this->baseDir . '/' . $subdirName;

        if (!file_exists($path)) {
            $result = wp_mkdir_p($path);
        }

        return $path;
    }

    public function createBlockDirectory(string $blockSlug, int $postId = null): string
    {
        $blockDir = $this->baseDir . '/' . $blockSlug;

        if (!file_exists($blockDir)) {
            $result = wp_mkdir_p($blockDir);
            if (!$result) {
                error_log('DirectoryManager: Failed to create block directory: ' . $blockDir);
                return $blockDir; // Return early if directory creation failed
            }
        }

        // Generate index.asset.php (always the same, so handled here as utility)
        IndexAssets::generate($blockDir);

        // Other files (index.js, render.php, etc.) are handled by the unified generation system
        return $blockDir;
    }

    public function cleanupAllFiles(): void
    {

        if (file_exists($this->baseDir)) {
            $this->deleteDirectory($this->baseDir);
        }
    }

    public function getBaseDirectory(): string
    {
        return $this->baseDir;
    }

    public function deleteBlockDirectory(string $blockSlug): bool
    {
        $blockDir = $this->baseDir . '/' . $blockSlug;

        if (!file_exists($blockDir)) {
            return true;
        }

        $this->deleteDirectory($blockDir);
        return true;
    }

    public function deleteFile(string $relativePath): bool
    {
        $filepath = $this->baseDir . '/' . $relativePath;

        if (!file_exists($filepath)) {
            return true;
        }

        $result = wp_delete_file($filepath);

        return $result;
    }

    /**
     * Delete a specific directory and all its contents
     */
    public function deleteSpecificDirectory(string $dirPath): bool
    {
        if (!is_dir($dirPath)) {
            return true; // Already doesn't exist
        }

        $this->deleteDirectory($dirPath);
        return !is_dir($dirPath); // Return true if successfully deleted
    }

    private function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        require_once(ABSPATH . 'wp-admin/includes/file.php');

        if (function_exists('WP_Filesystem')) {
            WP_Filesystem();
            global $wp_filesystem;

            if ($wp_filesystem) {
                $wp_filesystem->rmdir($dir, true);
                return;
            }
        }

        // Fallback to manual deletion if WP_Filesystem is not available
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $filepath = $dir . '/' . $file;
            if (is_dir($filepath)) {
                $this->deleteDirectory($filepath);
            } else {
                wp_delete_file($filepath);
            }
        }

        // If WP_Filesystem failed, leave directory - don't use direct rmdir()
        // This ensures WordPress coding standards compliance
    }

}