<?php

namespace Fanculo\FilesManager\Services;

class FileWriter
{
    public function writeFile(string $filepath, string $content): bool
    {
        $directory = dirname($filepath);

        if (!file_exists($directory)) {
            $result = wp_mkdir_p($directory);
            if (!$result) {
                error_log("FileWriter: Failed to create directory: $directory");
                return false;
            }
        }

        $result = file_put_contents($filepath, $content);

        if ($result === false) {
            error_log("FileWriter: Failed to write file: $filepath");
            return false;
        }

        error_log("FileWriter: Successfully wrote file: $filepath (" . strlen($content) . " bytes)");
        return true;
    }

    public function fileExists(string $filepath): bool
    {
        return file_exists($filepath);
    }

    public function deleteFile(string $filepath): bool
    {
        if (!file_exists($filepath)) {
            return true;
        }

        $result = unlink($filepath);

        if ($result) {
            error_log("FileWriter: Successfully deleted file: $filepath");
        } else {
            error_log("FileWriter: Failed to delete file: $filepath");
        }

        return $result;
    }

    public function getFileSize(string $filepath): int
    {
        return file_exists($filepath) ? filesize($filepath) : 0;
    }

    public function validateFilePath(string $filepath): bool
    {
        // Basic validation to ensure the path is safe
        $realPath = realpath(dirname($filepath));
        $basePath = realpath(WP_CONTENT_DIR . '/plugins/fanculo-blocks');

        // Ensure the file is within our allowed directory
        return $realPath !== false && $basePath !== false && strpos($realPath, $basePath) === 0;
    }
}