<?php

namespace FanCoolo\FilesManager\Interfaces;

interface FileWriterInterface
{
    /**
     * Write content to a file
     */
    public function writeFile(string $filepath, string $content): bool;

    /**
     * Write content to file only if it has changed (idempotent operation)
     */
    public function writeIfChanged(string $filepath, string $content): bool;

    /**
     * Delete a file if it exists
     */
    public function deleteIfExists(string $filepath): bool;

    /**
     * Check if a write operation is required (content has changed)
     */
    public function isWriteRequired(string $filepath, string $content): bool;

    /**
     * Check if a file exists
     */
    public function fileExists(string $filepath): bool;

    /**
     * Get file size
     */
    public function getFileSize(string $filepath): int;

    /**
     * Validate file path for security
     */
    public function validateFilePath(string $filepath): bool;

    /**
     * Get file content
     */
    public function getFileContent(string $filepath): string|false;

    /**
     * Get file modification time
     */
    public function getFileModificationTime(string $filepath): int|false;
}