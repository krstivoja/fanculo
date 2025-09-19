<?php

namespace Fanculo\Services;

use Fanculo\FilesManager\FilesManagerService;

class FileGenerationService
{
    private $filesManagerService;

    public function __construct()
    {
        $this->filesManagerService = new FilesManagerService();
        $this->initializeHooks();
    }

    private function initializeHooks()
    {
        // Hook into post save action
        add_action('save_post', [$this, 'onPostSave'], 10, 3);

        // Hook into post update to detect slug changes
        add_action('post_updated', [$this, 'onPostUpdated'], 10, 3);

        // Hook into post deletion
        add_action('before_delete_post', [$this, 'onPostDelete'], 10, 1);

        // Hook for when post transitions to trash (soft delete)
        add_action('wp_trash_post', [$this, 'onPostDelete'], 10, 1);

        // Add admin action for manual testing
        add_action('wp_ajax_fanculo_test_generation', [$this, 'testFileGeneration']);
    }

    public function onPostSave($postId, $post, $update)
    {
        // Avoid infinite loops and autosaves
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Check user permissions
        if (!current_user_can('edit_post', $postId)) {
            return;
        }

        // Generate files
        $this->filesManagerService->generateFilesOnPostSave($postId, $post, $update);
    }

    public function onPostUpdated($postId, $postAfter, $postBefore)
    {
        // Avoid infinite loops and autosaves
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Check user permissions
        if (!current_user_can('edit_post', $postId)) {
            return;
        }

        // Handle rename if slug changed
        $this->filesManagerService->handlePostRename($postId, $postAfter, $postBefore);
    }

    public function onPostDelete($postId)
    {
        // Check user permissions
        if (!current_user_can('delete_post', $postId)) {
            return;
        }

        // Handle post deletion
        $this->filesManagerService->handlePostDeletion($postId);
    }

    public function regenerateAllFiles()
    {
        return $this->filesManagerService->regenerateAllFiles();
    }

    public function testFileGeneration()
    {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }

        $result = $this->filesManagerService->debugTest();
        echo $result;
        wp_die();
    }
}