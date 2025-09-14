<?php
// Load WordPress
require_once '../../../wp-load.php';

// Trigger file generation for all posts
use Fanculo\Services\FileGenerationService;

if (current_user_can('manage_options')) {
    echo "<h2>Fanculo File Generation Test</h2>";

    $service = new FileGenerationService();

    // First, test directory creation
    echo "<h3>Testing Directory Creation</h3>";
    echo "<pre>" . $service->debugTest() . "</pre>";

    // Get all funculo posts
    echo "<h3>Available Funculo Posts</h3>";
    $posts = get_posts([
        'post_type' => 'funculo',
        'post_status' => 'any',
        'numberposts' => -1
    ]);

    echo "<p>Found " . count($posts) . " posts:</p><ul>";
    foreach ($posts as $post) {
        $terms = wp_get_post_terms($post->ID, 'funculo_type');
        $termSlugs = array_map(function($t) { return $t->slug; }, $terms);

        // Get meta content for debugging
        $metaInfo = [];
        if (in_array('blocks', $termSlugs)) {
            $metaInfo[] = 'PHP: ' . strlen(get_post_meta($post->ID, '_funculo_block_php', true));
            $metaInfo[] = 'SCSS: ' . strlen(get_post_meta($post->ID, '_funculo_block_scss', true));
            $metaInfo[] = 'JS: ' . strlen(get_post_meta($post->ID, '_funculo_block_js', true));
        }
        if (in_array('symbols', $termSlugs)) {
            $metaInfo[] = 'Symbol PHP: ' . strlen(get_post_meta($post->ID, '_funculo_symbol_php', true));
        }
        if (in_array('scss-partials', $termSlugs)) {
            $metaInfo[] = 'SCSS Partial: ' . strlen(get_post_meta($post->ID, '_funculo_scss_partial_scss', true));
        }

        echo "<li>ID: {$post->ID}, Title: '{$post->post_title}', Slug: '{$post->post_name}', Terms: " . implode(', ', $termSlugs) . "<br>";
        echo "&nbsp;&nbsp;&nbsp;&nbsp;Meta: " . implode(', ', $metaInfo) . "</li>";
    }
    echo "</ul>";

    // Now try to generate files for all posts
    echo "<h3>Generating Files</h3>";
    $service->regenerateAllFiles();

    echo "<p>File generation completed. Check the directories:</p>";
    echo "<ul>";
    echo "<li><code>/wp-content/plugins/fanculo-blocks/scss/</code></li>";
    echo "<li><code>/wp-content/plugins/fanculo-blocks/symbols/</code></li>";
    echo "<li><code>/wp-content/plugins/fanculo-blocks/{block-slug}/</code></li>";
    echo "</ul>";

} else {
    echo "Not authorized - please log in as admin";
}
?>