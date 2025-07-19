import winston from 'winston';
import { DebugLog } from './database';

// Create logger instance
const transports: winston.transport[] = [];

// In production (Vercel), only use console logging
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  );
} else {
  // In development, use file logging
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

const logger = winston.createLogger({
  level: process.env.DEBUG_LOGS === 'true' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'novgen' },
  transports,
});

export class Logger {
  private projectId?: string;
  private debugLogs: DebugLog[] = [];

  constructor(projectId?: string) {
    this.projectId = projectId;
  }

  private createLogEntry(level: 'info' | 'warning' | 'error' | 'debug', message: string, data?: Record<string, unknown>): DebugLog {
    const logEntry: DebugLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    // Store in memory for project-specific logs
    if (this.projectId) {
      this.debugLogs.push(logEntry);
    }

    return logEntry;
  }

  info(message: string, data?: Record<string, unknown>) {
    const logEntry = this.createLogEntry('info', message, data);
    logger.info(message, { projectId: this.projectId, ...data });
    return logEntry;
  }

  warning(message: string, data?: Record<string, unknown>) {
    const logEntry = this.createLogEntry('warning', message, data);
    logger.warn(message, { projectId: this.projectId, ...data });
    return logEntry;
  }

  error(message: string, error?: Error | string, data?: Record<string, unknown>) {
    const logEntry = this.createLogEntry('error', message, { 
      error: typeof error === 'string' ? error : error?.message || error, 
      stack: error instanceof Error ? error.stack : undefined, 
      ...data 
    });
    logger.error(message, { projectId: this.projectId, error, ...data });
    return logEntry;
  }

  debug(message: string, data?: Record<string, unknown>) {
    const logEntry = this.createLogEntry('debug', message, data);
    logger.debug(message, { projectId: this.projectId, ...data });
    return logEntry;
  }

  // Get all logs for this project
  getLogs(): DebugLog[] {
    return [...this.debugLogs];
  }

  // Clear project logs
  clearLogs() {
    this.debugLogs = [];
  }
}

// Global logger instance
export const globalLogger = new Logger();

// Function to create project-specific logger
export function createProjectLogger(projectId: string): Logger {
  return new Logger(projectId);
}
