<?php

namespace Fanculo\FilesManager\Files;

class IndexAssets
{
    public static function generate(string $blockDir): bool
    {
        $indexAssetPath = $blockDir . '/index.asset.php';
        
        $version = time() . wp_rand(100000, 999999);

        $content = '<?php return array( "dependencies" => array( "wp-block-editor", "wp-blocks", "wp-element", "wp-i18n", "wp-server-side-render", "wp-interactivity", "fanculo-block-renderer" ), "version" => "' . $version . '" );';

        $result = file_put_contents($indexAssetPath, $content);

        return $result !== false;
    }
}