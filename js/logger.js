/**
 * Centralized logging and error handling utilities
 */

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = LogLevel.INFO;
    this.enabled = true;
  }

  /**
   * Set the logging level
   * @param {number} level - Log level from LogLevel enum
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * Enable or disable logging
   * @param {boolean} enabled - Whether logging is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Format log message with timestamp and level
   * @param {string} level - Log level string
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    return [`[${timestamp}] [${level}] ${message}`, ...args];
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    if (this.enabled && this.level >= LogLevel.ERROR) {
      console.error(...this.formatMessage('ERROR', message, ...args));
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this.enabled && this.level >= LogLevel.WARN) {
      console.warn(...this.formatMessage('WARN', message, ...args));
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (this.enabled && this.level >= LogLevel.INFO) {
      console.info(...this.formatMessage('INFO', message, ...args));
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.enabled && this.level >= LogLevel.DEBUG) {
      console.debug(...this.formatMessage('DEBUG', message, ...args));
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

/**
 * Error handler that logs errors and shows user-friendly messages
 */
export class ErrorHandler {
  /**
   * Handle application errors
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @param {boolean} showToUser - Whether to show error to user
   */
  static handle(error, context = 'Unknown', showToUser = false) {
    const errorMessage = `Error in ${context}: ${error.message}`;
    logger.error(errorMessage, error);

    if (showToUser) {
      this.showUserError(errorMessage);
    }

    // In development, rethrow the error
    if (this.isDevelopment()) {
      throw error;
    }
  }

  /**
   * Handle async errors with retry capability
   * @param {Function} asyncFn - Async function to execute
   * @param {string} context - Context description
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<any>} Result of async function
   */
  static async handleAsync(asyncFn, context = 'Async operation', maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Attempting ${context} (attempt ${attempt}/${maxRetries})`);
        return await asyncFn();
      } catch (error) {
        lastError = error;
        logger.warn(`${context} failed on attempt ${attempt}: ${error.message}`);

        if (attempt < maxRetries) {
          // Exponential backoff: wait 2^attempt seconds
          const delay = Math.pow(2, attempt) * 1000;
          logger.debug(`Retrying ${context} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    this.handle(lastError, context, true);
    throw lastError;
  }

  /**
   * Show error message to user
   * @param {string} message - Error message to display
   */
  static showUserError(message) {
    // Create or update error notification
    let errorElement = document.getElementById('error-notification');

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-notification';
      errorElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9999;
        max-width: 400px;
        cursor: pointer;
      `;

      errorElement.addEventListener('click', () => {
        errorElement.remove();
      });

      document.body.appendChild(errorElement);
    }

    errorElement.textContent = message;

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if in development
   */
  static isDevelopment() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
  }
}

/**
 * Global error handler for uncaught errors
 */
window.addEventListener('error', (event) => {
  ErrorHandler.handle(event.error, 'Global error handler', false);
});

/**
 * Global handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handle(new Error(event.reason), 'Unhandled promise rejection', false);
  event.preventDefault(); // Prevent console error
});