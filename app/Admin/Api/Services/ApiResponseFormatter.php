<?php

namespace Fanculo\Admin\Api\Services;

use WP_REST_Response;
use WP_Error;

/**
 * API Response Formatter for consistent response structure
 *
 * Provides standardized response formatting across all API endpoints,
 * ensuring consistent structure for success, error, and batch responses.
 */
class ApiResponseFormatter
{
    /**
     * Format a successful response
     *
     * @param mixed $data Response data
     * @param array $meta Optional metadata
     * @param int $status HTTP status code
     * @return WP_REST_Response
     */
    public function success($data, array $meta = [], int $status = 200): WP_REST_Response
    {
        $response = [
            'success' => true,
            'data' => $data,
        ];

        // Add metadata if provided
        if (!empty($meta)) {
            $response['meta'] = $this->formatMetadata($meta);
        }

        // Add timestamp
        $response['timestamp'] = current_time('c');

        return new WP_REST_Response($response, $status);
    }

    /**
     * Format an error response
     *
     * @param string $code Error code
     * @param string $message Error message
     * @param int $status HTTP status code
     * @param array $additionalData Additional error data
     * @return WP_Error
     */
    public function error(string $code, string $message, int $status = 500, array $additionalData = []): WP_Error
    {
        $errorData = array_merge([
            'status' => $status,
            'timestamp' => current_time('c'),
        ], $additionalData);

        return new WP_Error($code, $message, $errorData);
    }

    /**
     * Format a batch operation response
     *
     * @param array $results Batch operation results
     * @param array $performance Performance metrics
     * @param int $status HTTP status code (207 for partial success)
     * @return WP_REST_Response
     */
    public function batch(array $results, array $performance = [], int $status = 200): WP_REST_Response
    {
        $response = [
            'success' => empty($results['failed']),
            'data' => [
                'successful' => $results['successful'] ?? [],
                'failed' => $results['failed'] ?? [],
            ],
            'meta' => [
                'total' => $results['total'] ?? 0,
                'successful_count' => count($results['successful'] ?? []),
                'failed_count' => count($results['failed'] ?? []),
            ],
        ];

        // Add performance metrics
        if (!empty($performance)) {
            $response['meta']['performance'] = $performance;
        }

        // Add summary for quick access
        $response['summary'] = [
            'total_operations' => $results['total'] ?? 0,
            'completed' => count($results['successful'] ?? []),
            'errors' => count($results['failed'] ?? []),
            'success_rate' => $this->calculateSuccessRate($results),
        ];

        // Add timestamp
        $response['timestamp'] = current_time('c');

        return new WP_REST_Response($response, $status);
    }

    /**
     * Format a paginated response
     *
     * @param array $items Items in current page
     * @param int $total Total number of items
     * @param int $page Current page number
     * @param int $perPage Items per page
     * @param array $additionalMeta Additional metadata
     * @return WP_REST_Response
     */
    public function paginated(array $items, int $total, int $page, int $perPage, array $additionalMeta = []): WP_REST_Response
    {
        $totalPages = ceil($total / $perPage);

        $response = [
            'success' => true,
            'data' => $items,
            'meta' => array_merge([
                'pagination' => [
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'has_next' => $page < $totalPages,
                    'has_previous' => $page > 1,
                ],
            ], $additionalMeta),
            'timestamp' => current_time('c'),
        ];

        return new WP_REST_Response($response, 200);
    }

    /**
     * Format a collection response
     *
     * @param array $items Collection items
     * @param array $meta Optional metadata
     * @return WP_REST_Response
     */
    public function collection(array $items, array $meta = []): WP_REST_Response
    {
        return $this->success($items, array_merge(['count' => count($items)], $meta));
    }

    /**
     * Format a single item response
     *
     * @param mixed $item Single item data
     * @param array $meta Optional metadata
     * @return WP_REST_Response
     */
    public function item($item, array $meta = []): WP_REST_Response
    {
        return $this->success($item, $meta);
    }

    /**
     * Format an empty response
     *
     * @param string $message Optional message
     * @return WP_REST_Response
     */
    public function empty(string $message = 'No data found'): WP_REST_Response
    {
        return $this->success([], ['message' => $message]);
    }

    /**
     * Format a created response (201)
     *
     * @param mixed $data Created resource data
     * @param array $meta Optional metadata
     * @return WP_REST_Response
     */
    public function created($data, array $meta = []): WP_REST_Response
    {
        return $this->success($data, array_merge(['message' => 'Resource created successfully'], $meta), 201);
    }

    /**
     * Format an updated response
     *
     * @param mixed $data Updated resource data
     * @param array $meta Optional metadata
     * @return WP_REST_Response
     */
    public function updated($data, array $meta = []): WP_REST_Response
    {
        return $this->success($data, array_merge(['message' => 'Resource updated successfully'], $meta));
    }

    /**
     * Format a deleted response
     *
     * @param string $message Deletion message
     * @param array $meta Optional metadata
     * @return WP_REST_Response
     */
    public function deleted(string $message = 'Resource deleted successfully', array $meta = []): WP_REST_Response
    {
        return $this->success(null, array_merge(['message' => $message], $meta));
    }

    /**
     * Format validation errors response
     *
     * @param array $errors Validation errors
     * @return WP_Error
     */
    public function validationError(array $errors): WP_Error
    {
        return $this->error(
            'validation_failed',
            'Validation failed',
            400,
            ['validation_errors' => $errors]
        );
    }

    /**
     * Format permission denied response
     *
     * @param string $message Custom message
     * @return WP_Error
     */
    public function permissionDenied(string $message = 'You do not have permission to perform this action'): WP_Error
    {
        return $this->error('permission_denied', $message, 403);
    }

    /**
     * Format not found response
     *
     * @param string $resource Resource type
     * @param mixed $id Resource ID
     * @return WP_Error
     */
    public function notFound(string $resource = 'Resource', $id = null): WP_Error
    {
        $message = $id ? "{$resource} with ID {$id} not found" : "{$resource} not found";
        return $this->error('not_found', $message, 404);
    }

    /**
     * Format server error response
     *
     * @param string $message Error message
     * @param \Exception|null $exception Optional exception for debugging
     * @return WP_Error
     */
    public function serverError(string $message = 'An internal server error occurred', ?\Exception $exception = null): WP_Error
    {
        $errorData = [];

        // Add exception details in development mode
        if (defined('WP_DEBUG') && WP_DEBUG && $exception) {
            $errorData['debug'] = [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
            ];
        }

        return $this->error('server_error', $message, 500, $errorData);
    }

    /**
     * Format rate limit exceeded response
     *
     * @param int $retryAfter Seconds until retry is allowed
     * @return WP_Error
     */
    public function rateLimitExceeded(int $retryAfter = 60): WP_Error
    {
        return $this->error(
            'rate_limit_exceeded',
            'Rate limit exceeded. Please try again later.',
            429,
            ['retry_after' => $retryAfter]
        );
    }

    /**
     * Format timeout response
     *
     * @param string $operation Operation that timed out
     * @return WP_Error
     */
    public function timeout(string $operation = 'Operation'): WP_Error
    {
        return $this->error(
            'timeout',
            "{$operation} timed out. Please try again.",
            408
        );
    }

    /**
     * Format conflict response
     *
     * @param string $message Conflict description
     * @return WP_Error
     */
    public function conflict(string $message): WP_Error
    {
        return $this->error('conflict', $message, 409);
    }

    /**
     * Format metadata for response
     *
     * @param array $meta Raw metadata
     * @return array Formatted metadata
     */
    private function formatMetadata(array $meta): array
    {
        $formatted = [];

        // Standard metadata fields
        $standardFields = [
            'total', 'count', 'page', 'per_page', 'total_pages',
            'performance', 'cache_hit', 'message',
        ];

        // Add standard fields if present
        foreach ($standardFields as $field) {
            if (isset($meta[$field])) {
                $formatted[$field] = $meta[$field];
            }
        }

        // Add any additional custom metadata
        foreach ($meta as $key => $value) {
            if (!in_array($key, $standardFields)) {
                $formatted[$key] = $value;
            }
        }

        return $formatted;
    }

    /**
     * Calculate success rate for batch operations
     *
     * @param array $results Batch results
     * @return float Success rate percentage
     */
    private function calculateSuccessRate(array $results): float
    {
        $total = $results['total'] ?? 0;
        if ($total === 0) {
            return 0.0;
        }

        $successful = count($results['successful'] ?? []);
        return round(($successful / $total) * 100, 2);
    }

    /**
     * Wrap existing response in standard format
     *
     * @param mixed $response Existing response data
     * @param array $meta Additional metadata
     * @return WP_REST_Response
     */
    public function wrap($response, array $meta = []): WP_REST_Response
    {
        // If already a WP_REST_Response, extract data
        if ($response instanceof WP_REST_Response) {
            $data = $response->get_data();
            $status = $response->get_status();
        } else {
            $data = $response;
            $status = 200;
        }

        return $this->success($data, $meta, $status);
    }
}