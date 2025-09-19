<?php
/**
 * InnerBlocks processor utility
 * Handles the replacement of <InnerBlocks /> placeholders in block templates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Regex pattern for detecting InnerBlocks placeholders (case-insensitive)
// Matches: <InnerBlocks />, <innerblock />, <Innerblocks />, <innerBlocks />, <innerblocks></innerblocks>, etc.
define( 'NBNPX_INNERBLOCKS_PATTERN', '/<inner\s*blocks?\s*\/?>\s*(?:<\/inner\s*blocks?\s*>)?/i' );

/**
 * Check if content contains InnerBlocks placeholders
 *
 * @param string $content Content to check
 * @return bool True if InnerBlocks found
 */
function nbnpx_has_innerblocks( $content ) {
	return preg_match( NBNPX_INNERBLOCKS_PATTERN, $content );
}

/**
 * Check if a specific file contains InnerBlocks placeholders
 *
 * @param string $file_path Path to the file to check
 * @return bool True if file exists and contains InnerBlocks
 */
function nbnpx_file_has_innerblocks( $file_path ) {
	if ( ! file_exists( $file_path ) ) {
		return false;
	}

	$content = file_get_contents( $file_path );
	return nbnpx_has_innerblocks( $content );
}

/**
 * Process a block template and replace <InnerBlocks /> with appropriate content
 *
 * @param string $template_path Path to the clean template file
 * @param array $attributes Block attributes
 * @param string $content Inner blocks content
 * @param WP_Block $block Block instance
 * @return string Processed HTML
 */
function nbnpx_process_innerblocks_template( $template_path, $attributes = [], $content = '', $block = null ) {
	if ( ! file_exists( $template_path ) ) {
		return '';
	}

	// Start output buffering to capture the template output
	ob_start();

	// Include the clean template
	include $template_path;

	// Get the rendered content
	$rendered_content = ob_get_clean();

	// Check if we're in editor context (when ServerSideRender is being used)
	$is_editor_context = defined('REST_REQUEST') && REST_REQUEST;

	if ( $is_editor_context ) {
		// In editor: replace any InnerBlocks variation with standardized placeholder for JavaScript
		return preg_replace(
			NBNPX_INNERBLOCKS_PATTERN,
			'<div class="fanculo-block-inserter"></div>',
			$rendered_content
		);
	} else {
		// On frontend: replace <InnerBlocks /> with actual inner blocks content
		return preg_replace(
			NBNPX_INNERBLOCKS_PATTERN,
			$content ?? '',
			$rendered_content
		);
	}
}

/**
 * Create a render callback that uses the InnerBlocks processor
 *
 * @param string $template_path Path to the clean template file
 * @return callable Render callback function
 */
function nbnpx_create_innerblocks_render_callback( $template_path ) {
	return function( $attributes, $content, $block ) use ( $template_path ) {
		return nbnpx_process_innerblocks_template( $template_path, $attributes, $content, $block );
	};
}

/**
 * Check if any block render templates contain <InnerBlocks /> placeholders
 */
function nbnpx_has_innerblocks_in_templates() {
	if ( ! defined( 'FANCULO_BLOCKS_DIR' ) ) {
		return false;
	}

	$render_files = glob( FANCULO_BLOCKS_DIR . '/*/render.php' );

	foreach ( $render_files as $render_file ) {
		if ( nbnpx_file_has_innerblocks( $render_file ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Conditionally enqueue the shared parser script only if templates actually contain <InnerBlocks />
 */
function nbnpx_enqueue_shared_parser() {
	// Only load the parser if we actually have <InnerBlocks /> in templates
	if ( nbnpx_has_innerblocks_in_templates() ) {
		wp_enqueue_script(
			'native-blocks-parser',
			plugins_url('inc/innerblocks-parser.js', dirname(__FILE__)),
			['wp-element', 'wp-block-editor'], // WordPress dependencies
			'1.0.0',
			true
		);
	}
}

// Only hook into WordPress if we're in a WordPress environment
if ( function_exists( 'add_action' ) ) {
	add_action('enqueue_block_editor_assets', 'nbnpx_enqueue_shared_parser');
}