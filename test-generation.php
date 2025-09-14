<?php
// Load WordPress
require_once '../../../wp-load.php';

// Test file generation
use Fanculo\Services\FileGenerationService;

if (current_user_can('manage_options')) {
    echo "Starting file generation test...\n";

    $service = new FileGenerationService();
    echo $service->debugTest();
    echo "\n";

    // Try to get a post with ID 5 (the one you were editing)
    $post = get_post(5);
    if ($post) {
        echo "Found post: " . $post->post_title . " (slug: " . $post->post_name . ")\n";
        echo "Post type: " . $post->post_type . "\n";

        $service->generateFilesOnPostSave(5, $post, true);
        echo "File generation attempted\n";
    } else {
        echo "Post with ID 5 not found\n";
    }

} else {
    echo "Not authorized\n";
}
?>