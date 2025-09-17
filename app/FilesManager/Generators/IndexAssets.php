<?php

namespace Fanculo\FilesManager\Generators;

class IndexAssets
{
    public static function generate(string $blockDir): bool
    {
        $indexAssetPath = $blockDir . '/index.asset.php';
        $version = time() . rand(100000, 999999);

        // Get the relative path to the utils directory
        $baseBlocksDir = dirname($blockDir);
        $utilsPath = $baseBlocksDir . '/utils/block-editor-utils.js';
        $relativeUtilsPath = '../utils/block-editor-utils.js';

        $content = <<<PHP
<?php
    return array(
        'dependencies' => array(
            'wp-block-editor',
            'wp-blocks',
            'wp-element',
            'wp-i18n',
            'wp-server-side-render',
            'wp-components'
        ),
        'version' => '{$version}'
    );
PHP;

        $result = file_put_contents($indexAssetPath, $content);

        if ($result !== false) {
            error_log("IndexAssets: Successfully created index.asset.php in $blockDir");
        } else {
            error_log("IndexAssets: Failed to create index.asset.php in $blockDir");
        }

        return $result !== false;
    }
}