<?php

namespace FanCoolo\FilesManager\Services;

use FanCoolo\FilesManager\Interfaces\FileWriterInterface;

class FileWriter implements FileWriterInterface
{
    public function writeFile(string $filepath, string $content): bool
    {
        $directory = dirname($filepath);

        if (!file_exists($directory)) {
            $result = wp_mkdir_p($directory);
            if (!$result) {
                return false;
            }
        }

        $result = file_put_contents($filepath, $content);

        if ($result === false) {
            return false;
        }

        return true;
    }

    public function fileExists(string $filepath): bool
    {
        return file_exists($filepath);
    }

    public function deleteFile(string $filepath): bool
    {
        return $this->deleteIfExists($filepath);
    }

    public function getFileSize(string $filepath): int
    {
        return file_exists($filepath) ? filesize($filepath) : 0;
    }

    public function validateFilePath(string $filepath): bool
    {
        // Basic validation to ensure the path is safe
        $realPath = realpath(dirname($filepath));
        $basePath = realpath(WP_CONTENT_DIR . '/plugins/fancoolo-blocks');

        // Ensure the file is within our allowed directory
        return $realPath !== false && $basePath !== false && strpos($realPath, $basePath) === 0;
    }

    public function writeIfChanged(string $filepath, string $content): bool
    {
        if (!$this->isWriteRequired($filepath, $content)) {
            return true;
        }

        return $this->writeFile($filepath, $content);
    }

    public function deleteIfExists(string $filepath): bool
    {
        if (!file_exists($filepath)) {
            return true;
        }

        $result = wp_delete_file($filepath);

        return $result;
    }

    public function isWriteRequired(string $filepath, string $content): bool
    {
        if (!file_exists($filepath)) {
            return true;
        }

        $existingContent = file_get_contents($filepath);
        return $existingContent !== $content;
    }

    public function getFileContent(string $filepath): string|false
    {
        if (!file_exists($filepath)) {
            return false;
        }

        return file_get_contents($filepath);
    }

    public function getFileModificationTime(string $filepath): int|false
    {
        if (!file_exists($filepath)) {
            return false;
        }

        return filemtime($filepath);
    }
}