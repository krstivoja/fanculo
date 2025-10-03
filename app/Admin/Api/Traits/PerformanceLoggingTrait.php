<?php

namespace FanCoolo\Admin\Api\Traits;

/**
 * Performance Logging Trait
 *
 * Provides standardized performance monitoring and logging capabilities
 * for API operations. Tracks execution times, memory usage, and database
 * query counts to help identify performance bottlenecks.
 */
trait PerformanceLoggingTrait
{
    /** @var array Performance metrics storage */
    private array $performanceMetrics = [];

    /** @var array Active timers */
    private array $activeTimers = [];

    /**
     * Start a performance timer
     *
     * @param string $operation_name Name of the operation being timed
     * @param array $context Additional context data
     * @return string Timer ID for stopping the timer
     */
    protected function startPerformanceTimer(string $operation_name, array $context = []): string
    {
        $timer_id = uniqid($operation_name . '_', true);

        $this->activeTimers[$timer_id] = [
            'operation' => $operation_name,
            'start_time' => microtime(true),
            'start_memory' => memory_get_usage(true),
            'start_peak_memory' => memory_get_peak_usage(true),
            'context' => $context,
        ];

        return $timer_id;
    }

    /**
     * Stop a performance timer and record metrics
     *
     * @param string $timer_id Timer ID returned from startPerformanceTimer
     * @param array $additional_context Additional context to add to metrics
     * @return array Performance metrics for this operation
     */
    protected function stopPerformanceTimer(string $timer_id, array $additional_context = []): array
    {
        if (!isset($this->activeTimers[$timer_id])) {
            return [];
        }

        $timer = $this->activeTimers[$timer_id];
        $end_time = microtime(true);
        $end_memory = memory_get_usage(true);
        $end_peak_memory = memory_get_peak_usage(true);

        $metrics = [
            'operation' => $timer['operation'],
            'duration_ms' => round(($end_time - $timer['start_time']) * 1000, 2),
            'memory_used_mb' => round(($end_memory - $timer['start_memory']) / 1024 / 1024, 2),
            'peak_memory_mb' => round($end_peak_memory / 1024 / 1024, 2),
            'timestamp' => current_time('mysql'),
            'context' => array_merge($timer['context'], $additional_context),
        ];

        // Store metrics
        $this->performanceMetrics[$timer_id] = $metrics;

        // Clean up timer
        unset($this->activeTimers[$timer_id]);

        // Log if performance is concerning
        $this->checkPerformanceThresholds($metrics);

        return $metrics;
    }

    /**
     * Log bulk operation performance
     *
     * @param string $operation_name Name of the bulk operation
     * @param int $item_count Number of items processed
     * @param float $start_time Start time from microtime(true)
     * @param array $additional_context Additional context data
     * @return array Performance metrics
     */
    protected function logBulkPerformance(string $operation_name, int $item_count, float $start_time, array $additional_context = []): array
    {
        $end_time = microtime(true);
        $duration_ms = round(($end_time - $start_time) * 1000, 2);

        $metrics = [
            'operation' => $operation_name,
            'item_count' => $item_count,
            'duration_ms' => $duration_ms,
            'items_per_second' => $item_count > 0 && $duration_ms > 0
                ? round($item_count / ($duration_ms / 1000), 2)
                : 0,
            'avg_time_per_item_ms' => $item_count > 0
                ? round($duration_ms / $item_count, 2)
                : 0,
            'memory_peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
            'timestamp' => current_time('mysql'),
            'context' => $additional_context,
        ];

        // Store metrics
        $metrics_id = uniqid($operation_name . '_bulk_', true);
        $this->performanceMetrics[$metrics_id] = $metrics;

        // Check thresholds
        $this->checkBulkPerformanceThresholds($metrics);

        // Log to BulkQueryService if available
        if (isset($this->bulkQueryService) && method_exists($this->bulkQueryService, 'logPerformance')) {
            $this->bulkQueryService->logPerformance($operation_name, $item_count, $start_time);
        }

        return $metrics;
    }

    /**
     * Get performance summary for all recorded operations
     *
     * @return array Performance summary
     */
    protected function getPerformanceSummary(): array
    {
        if (empty($this->performanceMetrics)) {
            return [];
        }

        $total_duration = array_sum(array_column($this->performanceMetrics, 'duration_ms'));
        $operations = array_column($this->performanceMetrics, 'operation');
        $operation_counts = array_count_values($operations);

        return [
            'total_operations' => count($this->performanceMetrics),
            'total_duration_ms' => round($total_duration, 2),
            'average_duration_ms' => round($total_duration / count($this->performanceMetrics), 2),
            'slowest_operation' => $this->getSlowestOperation(),
            'operation_breakdown' => $operation_counts,
            'peak_memory_mb' => max(array_column($this->performanceMetrics, 'peak_memory_mb')),
        ];
    }

    /**
     * Log database query performance
     *
     * @param string $query_type Type of query (SELECT, INSERT, UPDATE, DELETE)
     * @param float $start_time Query start time
     * @param int $affected_rows Number of rows affected
     * @param string $operation_context Context of the operation
     * @return array Query performance metrics
     */
    protected function logQueryPerformance(string $query_type, float $start_time, int $affected_rows = 0, string $operation_context = ''): array
    {
        $duration_ms = round((microtime(true) - $start_time) * 1000, 2);

        $metrics = [
            'query_type' => $query_type,
            'duration_ms' => $duration_ms,
            'affected_rows' => $affected_rows,
            'operation_context' => $operation_context,
            'timestamp' => current_time('mysql'),
        ];

        // Log slow queries
        if ($duration_ms > $this->getSlowQueryThreshold()) {
            $this->logSlowQuery($metrics);
        }

        return $metrics;
    }

    /**
     * Create performance metadata for API responses
     *
     * @param string $operation_name Name of the operation
     * @param float $start_time Operation start time
     * @param int $item_count Number of items processed (for bulk operations)
     * @return array Performance metadata
     */
    protected function createPerformanceMetadata(string $operation_name, float $start_time, int $item_count = 1): array
    {
        $duration_ms = round((microtime(true) - $start_time) * 1000, 2);

        $metadata = [
            'duration_ms' => $duration_ms,
            'memory_peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
            'timestamp' => current_time('c'), // ISO 8601 format
        ];

        // Add bulk-specific metrics
        if ($item_count > 1) {
            $metadata['item_count'] = $item_count;
            $metadata['items_per_second'] = $duration_ms > 0
                ? round($item_count / ($duration_ms / 1000), 2)
                : 0;
            $metadata['avg_time_per_item_ms'] = round($duration_ms / $item_count, 2);
        }

        // Add performance classification
        $metadata['performance_class'] = $this->classifyPerformance($duration_ms, $item_count);

        return $metadata;
    }

    /**
     * Check performance thresholds and log warnings
     *
     * @param array $metrics Performance metrics to check
     */
    private function checkPerformanceThresholds(array $metrics): void
    {
        $duration_ms = $metrics['duration_ms'];
        $operation = $metrics['operation'];

        // Log slow operations
        if ($duration_ms > $this->getSlowOperationThreshold()) {
            $this->logSlowOperation($metrics);
        }

        // Log high memory usage
        if (($metrics['peak_memory_mb'] ?? 0) > $this->getHighMemoryThreshold()) {
            $this->logHighMemoryUsage($metrics);
        }
    }

    /**
     * Check bulk performance thresholds
     *
     * @param array $metrics Bulk performance metrics
     */
    private function checkBulkPerformanceThresholds(array $metrics): void
    {
        $items_per_second = $metrics['items_per_second'];
        $operation = $metrics['operation'];

        // Log slow bulk operations
        if ($items_per_second < $this->getMinItemsPerSecond()) {
            $this->logSlowBulkOperation($metrics);
        }
    }

    /**
     * Get the slowest recorded operation
     *
     * @return array|null Slowest operation metrics
     */
    private function getSlowestOperation(): ?array
    {
        if (empty($this->performanceMetrics)) {
            return null;
        }

        return array_reduce($this->performanceMetrics, function($slowest, $current) {
            return ($slowest === null || $current['duration_ms'] > $slowest['duration_ms'])
                ? $current
                : $slowest;
        });
    }

    /**
     * Classify performance based on duration and item count
     *
     * @param float $duration_ms Operation duration in milliseconds
     * @param int $item_count Number of items processed
     * @return string Performance classification
     */
    private function classifyPerformance(float $duration_ms, int $item_count): string
    {
        $avg_time_per_item = $item_count > 0 ? $duration_ms / $item_count : $duration_ms;

        if ($avg_time_per_item < 50) {
            return 'excellent';
        } elseif ($avg_time_per_item < 200) {
            return 'good';
        } elseif ($avg_time_per_item < 500) {
            return 'acceptable';
        } elseif ($avg_time_per_item < 1000) {
            return 'slow';
        } else {
            return 'very_slow';
        }
    }

    /**
     * Log slow operation warning
     *
     * @param array $metrics Operation metrics
     */
    private function logSlowOperation(array $metrics): void
    {
        $message = sprintf(
            'Slow operation detected: %s took %s ms',
            $metrics['operation'],
            $metrics['duration_ms']
        );
        error_log("FanCoolo Performance Warning: {$message}");
    }

    /**
     * Log slow bulk operation warning
     *
     * @param array $metrics Bulk operation metrics
     */
    private function logSlowBulkOperation(array $metrics): void
    {
        $message = sprintf(
            'Slow bulk operation detected: %s processed %d items at %s items/second',
            $metrics['operation'],
            $metrics['item_count'],
            $metrics['items_per_second']
        );
        error_log("FanCoolo Performance Warning: {$message}");
    }

    /**
     * Log high memory usage warning
     *
     * @param array $metrics Operation metrics
     */
    private function logHighMemoryUsage(array $metrics): void
    {
        $message = sprintf(
            'High memory usage detected: %s used %s MB peak memory',
            $metrics['operation'],
            $metrics['peak_memory_mb']
        );
        error_log("FanCoolo Performance Warning: {$message}");
    }

    /**
     * Log slow query warning
     *
     * @param array $metrics Query metrics
     */
    private function logSlowQuery(array $metrics): void
    {
        $message = sprintf(
            'Slow query detected: %s %s took %s ms (context: %s)',
            $metrics['query_type'],
            $metrics['operation_context'],
            $metrics['duration_ms'],
            $metrics['operation_context']
        );
        error_log("FanCoolo Performance Warning: {$message}");
    }

    // Performance threshold getters (can be overridden in implementing classes)
    protected function getSlowOperationThreshold(): float { return 1000.0; } // 1 second
    protected function getHighMemoryThreshold(): float { return 50.0; } // 50 MB
    protected function getMinItemsPerSecond(): float { return 10.0; } // 10 items/second
    protected function getSlowQueryThreshold(): float { return 500.0; } // 500ms
}