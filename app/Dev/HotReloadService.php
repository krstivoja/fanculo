<?php

namespace Fanculo\Dev;

use Fanculo\Admin\Api\Services\ApiResponseFormatter;

/**
 * Hot Reload Service for Development
 * Handles SSE streaming and REST endpoints for dev-only hot reload
 */
class HotReloadService
{
    private $eventStore;
    private $responseFormatter;

    public function __construct()
    {
        // Only initialize in development environment
        if (!$this->isDevEnvironment()) {
            return;
        }

        $this->eventStore = new EventStore();
        $this->responseFormatter = new ApiResponseFormatter();

        // Hook into WordPress with proper guards
        add_action('parse_request', [$this, 'handleEventStream'], 5);
        add_action('rest_api_init', [$this, 'registerRestEndpoints']);
        add_action('admin_enqueue_scripts', [$this, 'enqueueAdminScripts']);
        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendScripts']);
    }

    /**
     * Check if we're in development environment
     */
    private function isDevEnvironment(): bool
    {
        // Use WordPress environment type detection
        if (function_exists('wp_get_environment_type')) {
            $envType = wp_get_environment_type();
            return in_array($envType, ['development', 'local'], true);
        }

        // Fallback: check for dev indicators
        return defined('WP_DEBUG') && WP_DEBUG;
    }

    /**
     * Check if user has dev permissions
     */
    public function canAccessDev(): bool
    {
        return is_user_logged_in() && current_user_can('edit_posts');
    }

    /**
     * Handle Server-Sent Events stream
     */
    public function handleEventStream($wp = null): void
    {
        if (!isset($_GET['fanculo-dev']) || $_GET['fanculo-dev'] !== 'stream') {
            return;
        }

        if (!$this->canAccessDev()) {
            status_header(403);
            exit('Forbidden');
        }

        // Verify nonce
        $nonce = $_GET['nonce'] ?? '';
        if (!wp_verify_nonce($nonce, 'fanculo_dev_stream')) {
            status_header(403);
            exit('Invalid nonce');
        }

        // Prevent WordPress from interfering
        $this->setupSSEHeaders();

        $lastEventId = intval($_GET['last-event-id'] ?? 0);
        $events = $this->eventStore->fetchSince($lastEventId);

        // Send any pending events immediately
        foreach ($events as $event) {
            echo "id: {$event['id']}\n";
            echo "event: {$event['type']}\n";
            echo "data: " . wp_json_encode($event) . "\n\n";
        }

        // Send connection confirmation
        echo "event: connected\n";
        echo "data: " . wp_json_encode(['timestamp' => microtime(true)]) . "\n\n";

        // Flush and close cleanly
        @ob_flush();
        @flush();

        exit;
    }

    /**
     * Setup SSE headers
     */
    private function setupSSEHeaders(): void
    {
        // Clear any existing output buffers
        while (ob_get_level()) {
            @ob_end_clean();
        }

        // Set SSE headers
        status_header(200);
        header('Content-Type: text/event-stream; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('Access-Control-Allow-Origin: *');
        header('X-Accel-Buffering: no');

        // Disable compression
        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }
        @ini_set('zlib.output_compression', '0');
    }

    /**
     * Register REST API endpoints
     */
    public function registerRestEndpoints(): void
    {
        // Events endpoint
        register_rest_route('fanculo-dev/v1', '/events', [
            'methods' => 'GET',
            'callback' => [$this, 'getEvents'],
            'permission_callback' => [$this, 'canAccessDev'],
            'args' => [
                'since' => [
                    'required' => false,
                    'type' => 'integer',
                    'default' => 0
                ]
            ]
        ]);

        // Status endpoint
        register_rest_route('fanculo-dev/v1', '/status', [
            'methods' => 'GET',
            'callback' => [$this, 'getStatus'],
            'permission_callback' => [$this, 'canAccessDev']
        ]);

        // Block HTML rendering endpoint (for hot reload updates)
        register_rest_route('fanculo-dev/v1', '/block-html', [
            'methods' => 'POST',
            'callback' => [$this, 'renderBlockHtml'],
            'permission_callback' => [$this, 'canAccessDev'],
            'args' => [
                'slug' => [
                    'required' => true,
                    'type' => 'string'
                ],
                'post_id' => [
                    'required' => false,
                    'type' => 'number',
                    'default' => 0
                ],
                'attributes' => [
                    'required' => false,
                    'type' => 'object',
                    'default' => []
                ]
            ]
        ]);
    }

    /**
     * Get events REST endpoint
     */
    public function getEvents($request)
    {
        $since = $request->get_param('since');
        $events = $this->eventStore->fetchSince($since);

        return $this->responseFormatter->success([
            'events' => $events,
            'timestamp' => microtime(true)
        ]);
    }

    /**
     * Get status REST endpoint
     */
    public function getStatus()
    {
        return $this->responseFormatter->success([
            'dev_mode' => true,
            'environment' => wp_get_environment_type(),
            'event_count' => $this->eventStore->getEventCount(),
            'log_path' => $this->eventStore->getLogPath(),
            'server_time' => microtime(true)
        ]);
    }

    /**
     * Render block HTML for hot reload updates
     */
    public function renderBlockHtml($request)
    {
        $slug = $request->get_param('slug');
        $post_id = $request->get_param('post_id');
        $attributes = $request->get_param('attributes') ?: [];

        try {
            // Create a mock block for rendering
            $block = [
                'blockName' => "fanculo/{$slug}",
                'attrs' => $attributes,
                'innerHTML' => '',
                'innerContent' => []
            ];

            // Parse and render the block
            $parsed_block = parse_blocks(serialize_block($block))[0];
            $html = render_block($parsed_block);

            return $this->responseFormatter->success(['html' => $html]);
        } catch (Exception $e) {
            return $this->responseFormatter->serverError("Block rendering failed: " . $e->getMessage());
        }
    }

    /**
     * Enqueue admin scripts
     */
    public function enqueueAdminScripts($hook): void
    {
        if (!$this->canAccessDev()) {
            return;
        }

        // Only load on specific admin pages
        $allowed_pages = [
            'post.php',
            'post-new.php',
            'edit.php',
            'toplevel_page_fanculo-app'
        ];

        if (!in_array($hook, $allowed_pages)) {
            return;
        }

        $script_path = FANCULO_PATH . 'assets/js/dev-admin.js';
        if (!file_exists($script_path)) {
            return;
        }

        // Ensure we don't interfere with main app loading
        wp_enqueue_script(
            'fanculo-dev-admin',
            FANCULO_URL . 'assets/js/dev-admin.js',
            [], // No dependencies to avoid conflicts
            FANCULO_VERSION . '-' . filemtime($script_path),
            true  // Load in footer after main app
        );

        $this->localizeDevData('fanculo-dev-admin');
    }

    /**
     * Enqueue frontend scripts
     */
    public function enqueueFrontendScripts(): void
    {
        if (is_admin() || !$this->canAccessDev()) {
            return;
        }

        $script_path = FANCULO_PATH . 'assets/js/dev-frontend.js';
        if (!file_exists($script_path)) {
            return;
        }

        wp_enqueue_script(
            'fanculo-dev-frontend',
            FANCULO_URL . 'assets/js/dev-frontend.js',
            [],
            FANCULO_VERSION . '-' . filemtime($script_path),
            true
        );

        $this->localizeDevData('fanculo-dev-frontend');
    }

    /**
     * Localize dev data for JavaScript
     */
    private function localizeDevData(string $handle): void
    {
        $lastEvent = $this->eventStore->fetchSince(0);
        $lastEventId = !empty($lastEvent) ? end($lastEvent)['id'] : 0;

        $dev_data = [
            'streamUrl' => home_url('/?fanculo-dev=stream&nonce=' . wp_create_nonce('fanculo_dev_stream')),
            'pollUrl' => rest_url('fanculo-dev/v1/events'),
            'blockHtmlUrl' => rest_url('fanculo-dev/v1/block-html'),
            'statusUrl' => rest_url('fanculo-dev/v1/status'),
            'restNonce' => wp_create_nonce('wp_rest'),
            'lastEventId' => $lastEventId,
            'environment' => wp_get_environment_type()
        ];

        wp_localize_script($handle, 'fanculoDevData', $dev_data);
    }

    /**
     * Get event store instance (for other services)
     */
    public function getEventStore(): EventStore
    {
        return $this->eventStore;
    }
}