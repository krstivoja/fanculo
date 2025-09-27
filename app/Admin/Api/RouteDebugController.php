<?php

namespace Fanculo\Admin\Api;

/**
 * Debug all registered routes
 */
class RouteDebugController
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'registerDebugRoute'], 99);
    }

    public function registerDebugRoute(): void
    {
        register_rest_route('fanculo/v1', '/debug/routes', [
            'methods' => 'GET',
            'callback' => [$this, 'listRoutes'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function listRoutes(): array
    {
        $server = rest_get_server();
        $routes = $server->get_routes();

        $fanculo_routes = [];
        foreach ($routes as $route => $handlers) {
            if (strpos($route, 'fanculo') !== false) {
                $methods = [];
                foreach ($handlers as $handler) {
                    if (isset($handler['methods'])) {
                        $methods = array_merge($methods, array_keys($handler['methods']));
                    }
                }
                $fanculo_routes[$route] = array_unique($methods);
            }
        }

        return [
            'success' => true,
            'routes' => $fanculo_routes,
            'total' => count($fanculo_routes)
        ];
    }
}