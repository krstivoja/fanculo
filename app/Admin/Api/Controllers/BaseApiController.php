<?php

namespace Fanculo\Admin\Api\Controllers;

use Fanculo\Admin\Api\Services\BulkQueryService;
use Fanculo\Admin\Api\Services\ApiResponseFormatter;
use Fanculo\Admin\Api\Services\UnifiedApiService;
use Fanculo\Admin\Api\Services\StandardBulkPipeline;
use Fanculo\Admin\Api\Traits\BulkOperationTrait;
use Fanculo\Admin\Api\Traits\PerformanceLoggingTrait;
use Fanculo\Admin\Api\Traits\CachingIntegrationTrait;

/**
 * Base API Controller with shared functionality
 *
 * Provides common services, permission checking, and utilities
 * for all Fanculo API controllers. Includes standardized bulk operations,
 * performance logging, and caching integration.
 */
abstract class BaseApiController
{
    use BulkOperationTrait;
    use PerformanceLoggingTrait;
    use CachingIntegrationTrait;

    protected $bulkQueryService;
    protected $responseFormatter;
    protected $unifiedApiService;
    protected $standardBulkPipeline;

    public function __construct()
    {
        $this->bulkQueryService = new BulkQueryService();
        $this->responseFormatter = new ApiResponseFormatter();
        $this->unifiedApiService = new UnifiedApiService();
        $this->standardBulkPipeline = new StandardBulkPipeline($this->bulkQueryService);
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    /**
     * Register REST API routes - must be implemented by child classes
     */
    abstract public function registerRoutes();

    /**
     * Check if user has basic read permissions
     */
    public function checkPermissions()
    {
        return current_user_can('edit_posts');
    }

    /**
     * Check if user has create/update permissions
     */
    public function checkCreatePermissions()
    {
        return current_user_can('edit_posts');
    }

    /**
     * Check if user has delete permissions
     */
    public function checkDeletePermissions()
    {
        return current_user_can('delete_posts');
    }

    /**
     * Handle errors in a consistent way
     *
     * @param \Exception $error The error to handle
     * @param string $context Context where error occurred
     * @return \WP_Error
     */
    protected function handleError($error, $context = '')
    {
        $message = $error->getMessage();
        if ($context) {
            $message = sprintf('%s: %s', $context, $message);
        }

        error_log("Fanculo API Error in {$context}: " . $error->getMessage());

        return new \WP_Error(
            'fanculo_api_error',
            $message,
            ['status' => 500]
        );
    }

    /**
     * Validate required parameters
     *
     * @param array $params Parameters to validate
     * @param array $required Required parameter names
     * @return \WP_Error|bool WP_Error on failure, true on success
     */
    protected function validateRequiredParams($params, $required)
    {
        $missing = [];
        foreach ($required as $param) {
            if (!isset($params[$param]) || empty($params[$param])) {
                $missing[] = $param;
            }
        }

        if (!empty($missing)) {
            return new \WP_Error(
                'missing_required_params',
                sprintf('Missing required parameters: %s', implode(', ', $missing)),
                ['status' => 400]
            );
        }

        return true;
    }

    /**
     * Get sanitized parameter from request
     *
     * @param \WP_REST_Request $request The request object
     * @param string $param Parameter name
     * @param mixed $default Default value
     * @return mixed Sanitized parameter value
     */
    protected function getParam($request, $param, $default = null)
    {
        return $request->get_param($param) ?? $default;
    }
}