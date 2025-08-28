import { app } from 'electron';
import { join } from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';

export class LogManager {
  private logger: winston.Logger;

  constructor() {
    const logsDir = join(app.getPath('userData'), 'logs');

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, error }) => {
          const processInfo = `[${process.type || 'unknown'}:${process.pid}]`;
          let logEntry = `${timestamp} ${processInfo} [${level.toUpperCase()}] ${message}`;

          if (error && error instanceof Error) {
            logEntry += `\n  Error: ${error.message}`;
            if (error.stack) {
              logEntry += `\n  Stack: ${error.stack}`;
            }
          }

          return logEntry;
        })
      ),
      transports: [
        new winston.transports.DailyRotateFile({
          filename: join(logsDir, 'friendly-kobold-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '5d',
          createSymlink: true,
          symlinkName: 'friendly-kobold.log',
        }),
      ],
    });

    this.setupGlobalErrorHandlers();
  }

  public logError(message: string, error?: Error) {
    this.logger.error(message, { error });
  }

  public logDebug(message: string) {
    // eslint-disable-next-line no-console
    console.log(message);
  }

  public setupGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      this.logError('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      const message = `Unhandled Promise Rejection at: ${promise}`;
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      this.logError(message, error);
    });
  }

  public getLogFilePath(): string {
    return join(app.getPath('userData'), 'logs', 'friendly-kobold.log');
  }

  public getLogsDirectory(): string {
    return join(app.getPath('userData'), 'logs');
  }
}
