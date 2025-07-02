/**
 * Production-ready logging utility
 * Replaces console statements with configurable logging
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Set log level based on environment
const LOG_LEVEL = import.meta.env.PROD ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;

class Logger {
  constructor(component = "App") {
    this.component = component;
  }

  error(message, ...args) {
    if (LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(`[${this.component}] ERROR:`, message, ...args);
    }
  }

  warn(message, ...args) {
    if (LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(`[${this.component}] WARN:`, message, ...args);
    }
  }

  info(message, ...args) {
    if (LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.info(`[${this.component}] INFO:`, message, ...args);
    }
  }

  debug(message, ...args) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(`[${this.component}] DEBUG:`, message, ...args);
    }
  }

  // Performance timing
  time(label) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.time(`[${this.component}] ${label}`);
    }
  }

  timeEnd(label) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.timeEnd(`[${this.component}] ${label}`);
    }
  }
}

// Create loggers for different components
export const createLogger = (component) => new Logger(component);

// Default logger
export const logger = new Logger("App");

export default logger;
