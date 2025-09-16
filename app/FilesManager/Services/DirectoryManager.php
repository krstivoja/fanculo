<?php

namespace Fanculo\FilesManager\Services;

class DirectoryManager
{
    private $baseDir;

    public function __construct()
    {
        $this->baseDir = WP_CONTENT_DIR . '/plugins/fanculo-blocks';
    }

    public function ensureBaseDirectoryExists(): bool
    {
        error_log("DirectoryManager: Checking base directory: {$this->baseDir}");

        if (!file_exists($this->baseDir)) {
            error_log("DirectoryManager: Creating base directory: {$this->baseDir}");
            $result = wp_mkdir_p($this->baseDir);
            error_log("DirectoryManager: Base directory creation result: " . ($result ? 'success' : 'failed'));
            return $result;
        }

        error_log("DirectoryManager: Base directory already exists");
        return true;
    }

    public function ensureSubdirectoryExists(string $subdirName): string
    {
        $path = $this->baseDir . '/' . $subdirName;

        if (!file_exists($path)) {
            error_log("DirectoryManager: Creating subdirectory: $path");
            $result = wp_mkdir_p($path);
            error_log("DirectoryManager: Subdirectory creation result: " . ($result ? 'success' : 'failed'));
        }

        return $path;
    }

    public function createBlockDirectory(string $blockSlug): string
    {
        $blockDir = $this->baseDir . '/' . $blockSlug;

        if (!file_exists($blockDir)) {
            error_log("DirectoryManager: Creating block directory: $blockDir");
            $result = wp_mkdir_p($blockDir);
            error_log("DirectoryManager: Block directory creation result: " . ($result ? 'success' : 'failed'));
        }

        return $blockDir;
    }

    public function cleanupAllFiles(): void
    {
        error_log("DirectoryManager: Cleaning up existing files");

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
            error_log("DirectoryManager: Block directory does not exist: $blockDir");
            return true;
        }

        error_log("DirectoryManager: Deleting block directory: $blockDir");
        $this->deleteDirectory($blockDir);
        return true;
    }

    public function deleteFile(string $relativePath): bool
    {
        $filepath = $this->baseDir . '/' . $relativePath;

        if (!file_exists($filepath)) {
            error_log("DirectoryManager: File does not exist: $filepath");
            return true;
        }

        $result = unlink($filepath);

        if ($result) {
            error_log("DirectoryManager: Successfully deleted file: $filepath");
        } else {
            error_log("DirectoryManager: Failed to delete file: $filepath");
        }

        return $result;
    }

    private function deleteDirectory(string $dir): void
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
}