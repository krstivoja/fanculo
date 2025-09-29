<?php

namespace Fanculo\FilesManager\Files;

class IndexAssets
{
    /**
     * Generate index.asset.php file with standard dependencies and cache-busting version
     * This file is always the same for every block - just dependencies + version
     */
    public static function generate(string $outputPath): bool
    {
        // Verify and create output path if needed
        if (!is_dir($outputPath)) {
            if (!wp_mkdir_p($outputPath)) {
                error_log('IndexAssets: Failed to create output directory: ' . $outputPath);
                return false;
            }
        }

        $indexAssetPath = $outputPath . '/index.asset.php';

        // Generate unique version for cache busting
        $version = time() . wp_rand(100000, 999999);

        // Standard WordPress block dependencies plus our custom renderer
        $dependencies = [
            'wp-block-editor',
            'wp-blocks',
            'wp-element',
            'wp-i18n',
            'wp-server-side-render',
            'fanculo-block-renderer'
        ];

        // Build the asset file content
        $content = '<?php return array( "dependencies" => ' . var_export($dependencies, true) . ', "version" => "' . $version . '" );';

        // Write the file with error handling
        $result = file_put_contents($indexAssetPath, $content);

        if ($result === false) {
            error_log('IndexAssets: Failed to write index.asset.php file: ' . $indexAssetPath);
            return false;
        }

        return true;
    }
}