/**
 * Simplified API Error Handler for Funculo Plugin
 *
 * Provides essential error handling and user notifications
 * without unnecessary complexity.
 */

import { ApiError } from './FunculoApiClient.js';

/**
 * Error severity levels (simplified)
 */
export const ErrorSeverity = {
  LOW: 'low',
  HIGH: 'high'
};

/**
 * User-friendly error messages
 */
const ErrorMessages = {
  network: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.'
  },
  permission: {
    title: 'Permission Denied',
    message: 'You don\'t have permission to perform this action. Please refresh the page and try again.'
  },
  validation: {
    title: 'Invalid Data',
    message: 'The information provided is not valid. Please check your input and try again.'
  },
  server: {
    title: 'Server Error',
    message: 'A server error occurred. Please try again in a few minutes.'
  },
  default: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please refresh the page and try again.'
  }
};

/**
 * Simplified Error Handler
 */
class SimpleErrorHandler {
  constructor() {
    this.notificationHandler = null;
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
      customMessage = null
    } = options;

    // Log to console for debugging
    console.error('API Error:', error);

    // Prepare user-friendly message
    const errorInfo = this.prepareErrorInfo(error, customMessage);

    // Show notification if requested and handler is available
    if (showNotification && this.notificationHandler) {
      this.showErrorNotification(errorInfo);
    }

    return {
      ...errorInfo,
      canRetry: this.canRetry(error)
    };
  }

  /**
   * Prepare user-friendly error information
   * @param {Error} error The error
   * @param {string} customMessage Custom error message
   * @returns {Object} Error information
   */
  prepareErrorInfo(error, customMessage) {
    const errorType = this.getErrorType(error);
    const severity = this.getSeverity(error);
    const template = ErrorMessages[errorType] || ErrorMessages.default;

    return {
      title: template.title,
      message: customMessage || template.message,
      severity,
      technical: error.message,
      status: error.status || null
    };
  }

  /**
   * Get error type for message selection
   * @param {Error} error The error
   * @returns {string} Error type
   */
  getErrorType(error) {
    if (error instanceof ApiError) {
      const status = error.status;

      if (status === 401 || status === 403) return 'permission';
      if (status === 422 || status === 400) return 'validation';
      if (status >= 500) return 'server';
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'network';
    }

    return 'default';
  }

  /**
   * Get error severity (simplified)
   * @param {Error} error The error
   * @returns {string} Severity level
   */
  getSeverity(error) {
    if (error instanceof ApiError) {
      return error.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.LOW;
    }

    // Network errors are high severity
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorSeverity.HIGH;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * Show error notification to user
   * @param {Object} errorInfo Error information
   */
  showErrorNotification(errorInfo) {
    const notificationType = errorInfo.severity === ErrorSeverity.HIGH ? 'error' : 'warning';
    const duration = errorInfo.severity === ErrorSeverity.HIGH ? 7000 : 4000;

    if (this.notificationHandler) {
      this.notificationHandler.show({
        type: notificationType,
        title: errorInfo.title,
        message: errorInfo.message,
        duration
      });
    } else {
      // Fallback to console for debugging
      console.warn('No notification handler set:', errorInfo);
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

    // Network errors are retryable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Set notification handler (e.g., Toast system)
   * @param {Object} handler Notification handler with show() method
   */
  setNotificationHandler(handler) {
    this.notificationHandler = handler;
  }
}

// Create and export singleton instance
export const errorHandler = new SimpleErrorHandler();

export default errorHandler;