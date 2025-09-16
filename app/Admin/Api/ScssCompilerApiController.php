<?php

namespace Fanculo\Admin\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class ScssCompilerApiController
{
    /**
     * Compile SCSS content to CSS and save it as meta
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function compileAndSaveScss(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');
        $scss_content = $request->get_param('scss_content');
        $css_content = $request->get_param('css_content');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        try {
            // Save SCSS content if provided
            if ($scss_content !== null) {
                update_post_meta($post_id, 'funculo_scss_content', $scss_content);
            }

            // Save compiled CSS content if provided
            if ($css_content !== null) {
                update_post_meta($post_id, 'funculo_css_content', $css_content);

                // Also save compilation timestamp
                update_post_meta($post_id, 'funculo_css_compiled_at', current_time('timestamp'));
            }

            return new WP_REST_Response([
                'success' => true,
                'post_id' => $post_id,
                'message' => 'SCSS compiled and saved successfully',
                'compiled_at' => current_time('c')
            ], 200);

        } catch (\Exception $e) {
            return new WP_Error('compilation_error', $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Get SCSS and CSS content for a post
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function getScssContent(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        $scss_content = get_post_meta($post_id, 'funculo_scss_content', true);
        $css_content = get_post_meta($post_id, 'funculo_css_content', true);
        $compiled_at = get_post_meta($post_id, 'funculo_css_compiled_at', true);

        return new WP_REST_Response([
            'post_id' => $post_id,
            'scss_content' => $scss_content ?: '',
            'css_content' => $css_content ?: '',
            'compiled_at' => $compiled_at ? date('c', $compiled_at) : null
        ], 200);
    }
}