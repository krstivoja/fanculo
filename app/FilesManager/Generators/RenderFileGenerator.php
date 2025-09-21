<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class RenderFileGenerator implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        $phpContent = get_post_meta($postId, MetaKeysConstants::BLOCK_PHP, true);

        if (empty($phpContent)) {
            return false;
        }

        // Process blockProps placeholder for PHP rendering
        $processedContent = $this->processBlockPropsPlaceholder($phpContent);

        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        return file_put_contents($filepath, $processedContent) !== false;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_PHP];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'render.php';
    }

    public function getFileExtension(): string
    {
        return 'php';
    }

    public function validate(int $postId): bool
    {
        $phpContent = get_post_meta($postId, MetaKeysConstants::BLOCK_PHP, true);
        return !empty($phpContent);
    }

    /**
     * Process blockProps placeholder in PHP content
     * Replaces 'blockProps' with the actual PHP code for block wrapper attributes
     *
     * @param string $phpContent The PHP content to process
     * @return string Processed PHP content
     */
    private function processBlockPropsPlaceholder(string $phpContent): string
    {
        // Replace blockProps placeholder with PHP code
        // This handles cases like: <div blockProps>, <section blockProps class="extra">, etc.
        $processed = preg_replace_callback(
            '/(<[^>]+?)(\s+)blockProps(\s*[^>]*?>)/i',
            function($matches) {
                $beforeBlockProps = $matches[1]; // e.g., "<div"
                $whitespace = $matches[2];       // whitespace before blockProps
                $afterBlockProps = $matches[3];  // everything after blockProps, including closing ">"

                // Check if there are already attributes after blockProps
                $trimmedAfter = trim($afterBlockProps);
                if ($trimmedAfter === '>') {
                    // Simple case: <div blockProps>
                    return $beforeBlockProps . ' <?php echo get_block_wrapper_attributes(); ?>' . $afterBlockProps;
                } else {
                    // Complex case: <div blockProps class="extra"> or <div blockProps id="test" class="extra">
                    // Extract the existing attributes
                    $existingAttrs = trim(substr($afterBlockProps, 0, -1)); // Remove the closing ">"

                    if (!empty($existingAttrs)) {
                        // Merge with existing attributes
                        return $beforeBlockProps . ' <?php echo get_block_wrapper_attributes(array( \'class\' => \'' .
                               $this->extractClassFromAttributes($existingAttrs) . '\' )); ?>' .
                               $this->extractNonClassAttributes($existingAttrs) . '>';
                    } else {
                        return $beforeBlockProps . ' <?php echo get_block_wrapper_attributes(); ?>' . $afterBlockProps;
                    }
                }
            },
            $phpContent
        );

        return $processed;
    }

    /**
     * Extract class attribute value from attribute string
     *
     * @param string $attributes The attributes string
     * @return string The class value or empty string
     */
    private function extractClassFromAttributes(string $attributes): string
    {
        if (preg_match('/class=["\']([^"\']*)["\']/', $attributes, $matches)) {
            return $matches[1];
        }
        return '';
    }

    /**
     * Extract non-class attributes from attribute string
     *
     * @param string $attributes The attributes string
     * @return string The non-class attributes
     */
    private function extractNonClassAttributes(string $attributes): string
    {
        // Remove class attribute but keep others
        $withoutClass = preg_replace('/\s*class=["\'][^"\']*["\']/', '', $attributes);
        return trim($withoutClass) ? ' ' . trim($withoutClass) : '';
    }
}