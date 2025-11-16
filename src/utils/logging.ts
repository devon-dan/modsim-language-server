/**
 * Logging system using Winston
 */

import * as winston from 'winston';
import * as path from 'path';
import * as os from 'os';

// Default log directory
const LOG_DIR = path.join(os.homedir(), '.modsim-lsp', 'logs');

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Logger instance
let logger: winston.Logger;

/**
 * Initialize the logger
 */
export function initLogger(options?: {
  level?: LogLevel;
  logFile?: string;
  enableConsole?: boolean;
}): void {
  const level = options?.level || LogLevel.INFO;
  const logFile = options?.logFile || path.join(LOG_DIR, 'modsim-lsp.log');
  const enableConsole = options?.enableConsole ?? false;

  const transports: winston.transport[] = [
    // File transport - always enabled
    new winston.transports.File({
      filename: logFile,
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
  ];

  // Console transport - optional (useful for development)
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
          })
        ),
      })
    );
  }

  logger = winston.createLogger({
    level,
    transports,
  });

  logger.info('Logger initialized', { level, logFile });
}

/**
 * Get the logger instance
 */
export function getLogger(): winston.Logger {
  if (!logger) {
    // Initialize with defaults if not yet initialized
    initLogger();
  }
  return logger;
}

/**
 * Log an error
 */
export function logError(message: string, meta?: any): void {
  getLogger().error(message, meta);
}

/**
 * Log a warning
 */
export function logWarn(message: string, meta?: any): void {
  getLogger().warn(message, meta);
}

/**
 * Log info
 */
export function logInfo(message: string, meta?: any): void {
  getLogger().info(message, meta);
}

/**
 * Log debug information
 */
export function logDebug(message: string, meta?: any): void {
  getLogger().debug(message, meta);
}
