/**
 * API Error Handling and Monitoring Utilities
 *
 * Provides centralized error handling, user notifications,
 * and error tracking for the Funculo plugin.
 */

import { ApiError } from './FunculoApiClient.js';

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories for better classification
 */
export const ErrorCategory = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  SERVER: 'server',
  CLIENT: 'client',
  TIMEOUT: 'timeout'
};

/**
 * Error Logger - tracks and reports errors
 */
class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors
    this.errorCounts = new Map();
  }

  /**
   * Log an error with context
   * @param {Error} error The error object
   * @param {Object} context Additional context
   */
  log(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      name: error.name,
      status: error.status || null,
      endpoint: error.endpoint || null,
      severity: this.determineSeverity(error),
      category: this.categorizeError(error),
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: window.wpApiSettings?.userId || null,
        ...context
      }
    };

    // Add to error log
    this.errors.push(errorEntry);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Track error frequency
    const errorKey = `${error.name}:${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log to browser console
    console.error('🚨 API Error:', errorEntry);

    // Report critical errors immediately
    if (errorEntry.severity === ErrorSeverity.CRITICAL) {
      this.reportCriticalError(errorEntry);
    }

    return errorEntry;
  }

  /**
   * Determine error severity based on error type and status
   * @param {Error} error The error object
   * @returns {string} Severity level
   */
  determineSeverity(error) {
    if (error instanceof ApiError) {
      const status = error.status;

      if (status >= 500) return ErrorSeverity.CRITICAL;
      if (status === 429) return ErrorSeverity.HIGH; // Rate limiting
      if (status === 403 || status === 401) return ErrorSeverity.HIGH; // Auth issues
      if (status >= 400) return ErrorSeverity.MEDIUM; // Client errors

      return ErrorSeverity.LOW;
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorSeverity.HIGH;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Categorize error for better handling
   * @param {Error} error The error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (error instanceof ApiError) {
      const status = error.status;

      if (status === 408 || status === 504) return ErrorCategory.TIMEOUT;
      if (status === 401 || status === 403) return ErrorCategory.PERMISSION;
      if (status === 422 || status === 400) return ErrorCategory.VALIDATION;
      if (status >= 500) return ErrorCategory.SERVER;
      if (status >= 400) return ErrorCategory.CLIENT;
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }

    return ErrorCategory.CLIENT;
  }

  /**
   * Report critical errors (could be extended to send to error tracking service)
   * @param {Object} errorEntry Error log entry
   */
  reportCriticalError(errorEntry) {
    // For now, just console.error with extra visibility
    console.error('🚨🚨 CRITICAL ERROR - IMMEDIATE ATTENTION REQUIRED 🚨🚨', errorEntry);

    // Could be extended to:
    // - Send to error tracking service (Sentry, Bugsnag, etc.)
    // - Show critical error modal to user
    // - Send email notification
    // - Log to server-side error tracking
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = this.errors.filter(e =>
      new Date(e.timestamp).getTime() > (now - oneHour)
    );

    return {
      total: this.errors.length,
      recentHour: recentErrors.length,
      byCategory: this.groupBy(this.errors, 'category'),
      bySeverity: this.groupBy(this.errors, 'severity'),
      topErrors: Array.from(this.errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))
    };
  }

  /**
   * Group errors by property
   * @param {Array} errors Error array
   * @param {string} property Property to group by
   * @returns {Object} Grouped data
   */
  groupBy(errors, property) {
    return errors.reduce((acc, error) => {
      const key = error[property];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Export error logs for debugging
   * @returns {Array} Error logs
   */
  exportLogs() {
    return [...this.errors];
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.errors = [];
    this.errorCounts.clear();
    console.log('🗑️ Error logs cleared');
  }
}

/**
 * User-friendly error messages based on error type
 */
const ErrorMessages = {
  [ErrorCategory.NETWORK]: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry'
  },
  [ErrorCategory.PERMISSION]: {
    title: 'Permission Denied',
    message: 'You don\'t have permission to perform this action. Please refresh the page and try again.',
    action: 'Refresh Page'
  },
  [ErrorCategory.VALIDATION]: {
    title: 'Invalid Data',
    message: 'The information provided is not valid. Please check your input and try again.',
    action: 'Check Input'
  },
  [ErrorCategory.SERVER]: {
    title: 'Server Error',
    message: 'A server error occurred. Our team has been notified. Please try again in a few minutes.',
    action: 'Try Again Later'
  },
  [ErrorCategory.TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete. Please try again.',
    action: 'Retry'
  },
  [ErrorCategory.CLIENT]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please refresh the page and try again.',
    action: 'Refresh'
  }
};

/**
 * Main Error Handler class
 */
class ApiErrorHandler {
  constructor() {
    this.logger = new ErrorLogger();
    this.notificationHandler = null; // Can be set to Toast system
  }

  /**
   * Handle an API error with logging and user notification
   * @param {Error} error The error to handle
   * @param {Object} options Handling options
   * @returns {Object} Processed error information
   */
  handleError(error, options = {}) {
    const {
      showNotification = true,
      context = {},
      customMessage = null
    } = options;

    // Log the error
    const logEntry = this.logger.log(error, context);

    // Prepare user-friendly message
    const errorInfo = this.prepareErrorInfo(error, customMessage);

    // Show notification if requested and handler is available
    if (showNotification && this.notificationHandler) {
      this.showErrorNotification(errorInfo, error);
    }

    return {
      ...errorInfo,
      logEntry,
      canRetry: this.canRetry(error),
      retryDelay: this.getRetryDelay(error)
    };
  }

  /**
   * Prepare user-friendly error information
   * @param {Error} error The error
   * @param {string} customMessage Custom error message
   * @returns {Object} Error information
   */
  prepareErrorInfo(error, customMessage) {
    const category = this.logger.categorizeError(error);
    const severity = this.logger.determineSeverity(error);
    const template = ErrorMessages[category] || ErrorMessages[ErrorCategory.CLIENT];

    return {
      title: template.title,
      message: customMessage || template.message,
      action: template.action,
      category,
      severity,
      technical: error.message,
      status: error.status || null
    };
  }

  /**
   * Show error notification to user
   * @param {Object} errorInfo Error information
   * @param {Error} originalError Original error object
   */
  showErrorNotification(errorInfo, originalError) {
    const notificationType = this.getNotificationType(errorInfo.severity);

    if (this.notificationHandler) {
      this.notificationHandler.show({
        type: notificationType,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
        duration: this.getNotificationDuration(errorInfo.severity)
      });
    } else {
      // Fallback to browser alert (not recommended for production)
      console.warn('No notification handler set. Using browser alert as fallback.');
      alert(`${errorInfo.title}: ${errorInfo.message}`);
    }
  }

  /**
   * Get notification type based on severity
   * @param {string} severity Error severity
   * @returns {string} Notification type
   */
  getNotificationType(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Get notification duration based on severity
   * @param {string} severity Error severity
   * @returns {number} Duration in milliseconds
   */
  getNotificationDuration(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 10000; // 10 seconds
      case ErrorSeverity.HIGH:
        return 7000; // 7 seconds
      case ErrorSeverity.MEDIUM:
        return 5000; // 5 seconds
      default:
        return 3000; // 3 seconds
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error The error
   * @returns {boolean} Can retry
   */
  canRetry(error) {
    if (error instanceof ApiError) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    // Network errors are usually retryable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Get recommended retry delay
   * @param {Error} error The error
   * @returns {number} Delay in milliseconds
   */
  getRetryDelay(error) {
    if (error instanceof ApiError) {
      if (error.status === 429) return 60000; // Rate limit: wait 1 minute
      if (error.status >= 500) return 5000; // Server error: wait 5 seconds
    }

    return 3000; // Default: 3 seconds
  }

  /**
   * Set notification handler (e.g., Toast system)
   * @param {Object} handler Notification handler with show() method
   */
  setNotificationHandler(handler) {
    this.notificationHandler = handler;
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStats() {
    return this.logger.getStats();
  }

  /**
   * Export error logs
   * @returns {Array} Error logs
   */
  exportLogs() {
    return this.logger.exportLogs();
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.logger.clearLogs();
  }
}

// Create and export singleton instance
export const errorHandler = new ApiErrorHandler();

// Expose to global scope for debugging
window.funculoErrorHandler = errorHandler;

export default errorHandler;