<?php

namespace FanCoolo\FilesManager\Interfaces;

use WP_Post;

interface FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool;

    public function generate(int $postId, WP_Post $post, string $outputPath): bool;

    public function getRequiredMetaKeys(): array;

    public function getGeneratedFileName(WP_Post $post): string;

    public function getFileExtension(): string;

    public function validate(int $postId): bool;
}