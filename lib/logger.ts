/**
 * Centralized logging utility
 *
 * In development: logs to console
 * In production: silenced (or could be sent to analytics)
 *
 * This replaces scattered console.log/console.error calls
 * and makes the codebase look more production-ready.
 */

const isDev = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: Date;
}

// Store recent logs for debugging (last 100)
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 100;

function addToHistory(entry: LogEntry) {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
}

function formatMessage(tag: string, message: string): string {
  return `[${tag}] ${message}`;
}

/**
 * Debug level - only in development
 */
function debug(tag: string, message: string, data?: unknown): void {
  const entry: LogEntry = { level: 'debug', tag, message, data, timestamp: new Date() };
  addToHistory(entry);

  if (isDev) {
    if (data !== undefined) {
      console.log(formatMessage(tag, message), data);
    } else {
      console.log(formatMessage(tag, message));
    }
  }
}

/**
 * Info level - important state changes
 */
function info(tag: string, message: string, data?: unknown): void {
  const entry: LogEntry = { level: 'info', tag, message, data, timestamp: new Date() };
  addToHistory(entry);

  if (isDev) {
    if (data !== undefined) {
      console.info(formatMessage(tag, message), data);
    } else {
      console.info(formatMessage(tag, message));
    }
  }
}

/**
 * Warning level - potential issues
 */
function warn(tag: string, message: string, data?: unknown): void {
  const entry: LogEntry = { level: 'warn', tag, message, data, timestamp: new Date() };
  addToHistory(entry);

  if (isDev) {
    if (data !== undefined) {
      console.warn(formatMessage(tag, message), data);
    } else {
      console.warn(formatMessage(tag, message));
    }
  }
}

/**
 * Error level - always logged, even in production
 */
function error(tag: string, message: string, err?: unknown): void {
  const entry: LogEntry = { level: 'error', tag, message, data: err, timestamp: new Date() };
  addToHistory(entry);

  // Errors are always logged
  if (err !== undefined) {
    console.error(formatMessage(tag, message), err);
  } else {
    console.error(formatMessage(tag, message));
  }

  // In production, could send to error tracking service
  // crashlytics().recordError(err);
}

/**
 * Get recent log history (useful for debugging)
 */
function getHistory(): LogEntry[] {
  return [...logHistory];
}

/**
 * Clear log history
 */
function clearHistory(): void {
  logHistory.length = 0;
}

const logger = {
  debug,
  info,
  warn,
  error,
  getHistory,
  clearHistory,
};

export default logger;
