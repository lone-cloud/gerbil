/* eslint-disable no-console */
import { app } from 'electron';
import { join } from 'path';
import { appendFile, existsSync, mkdirSync, statSync } from 'fs';

export class LogManager {
  private logFilePath: string;
  private maxLogSize = 10 * 1024 * 1024;
  private maxLogFiles = 5;
  private writeQueue: string[] = [];
  private isWriting = false;

  constructor() {
    const logsDir = join(app.getPath('userData'), 'logs');

    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    this.logFilePath = join(logsDir, 'friendly-kobold.log');
    this.initializeLogging();
  }

  private initializeLogging() {
    this.rotateLogsIfNeeded();
  }

  private rotateLogsIfNeeded() {
    if (!existsSync(this.logFilePath)) {
      return;
    }

    try {
      const stats = statSync(this.logFilePath);
      if (stats.size >= this.maxLogSize) {
        this.rotateLogs();
      }
    } catch (error) {
      console.warn('Failed to check log file size:', error);
    }
  }

  private rotateLogs() {
    const logsDir = join(app.getPath('userData'), 'logs');
    const baseName = 'friendly-kobold';

    try {
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldPath = join(logsDir, `${baseName}.${i}.log`);
        const newPath = join(logsDir, `${baseName}.${i + 1}.log`);

        if (existsSync(oldPath)) {
          if (i === this.maxLogFiles - 1) {
            try {
              require('fs').unlinkSync(oldPath);
            } catch (error) {
              console.warn(`Failed to delete old log file: ${oldPath}`, error);
            }
          } else {
            try {
              require('fs').renameSync(oldPath, newPath);
            } catch (error) {
              console.warn(
                `Failed to rotate log file: ${oldPath} -> ${newPath}`,
                error
              );
            }
          }
        }
      }

      const rotatedPath = join(logsDir, `${baseName}.1.log`);
      try {
        require('fs').renameSync(this.logFilePath, rotatedPath);
      } catch (error) {
        console.warn(
          `Failed to rotate current log file: ${this.logFilePath} -> ${rotatedPath}`,
          error
        );
      }
    } catch (error) {
      console.warn('Failed to rotate logs:', error);
    }
  }

  private formatLogEntry(
    level: string,
    message: string,
    error?: Error
  ): string {
    const timestamp = new Date().toISOString();
    const processInfo = `[${process.type || 'unknown'}:${process.pid}]`;

    let logEntry = `${timestamp} ${processInfo} [${level}] ${message}`;

    if (error) {
      logEntry += `\n  Error: ${error.message}`;
      if (error.stack) {
        logEntry += `\n  Stack: ${error.stack}`;
      }
    }

    return logEntry + '\n';
  }

  private writeToLog(entry: string) {
    this.writeQueue.push(entry);
    this.processWriteQueue();
  }

  private async processWriteQueue() {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    while (this.writeQueue.length > 0) {
      const entry = this.writeQueue.shift()!;
      try {
        await new Promise<void>((resolve, reject) => {
          appendFile(this.logFilePath, entry, 'utf8', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (error) {
        console.warn('Failed to write to log file:', error);
      }
    }

    this.isWriting = false;
  }

  public logError(message: string, error?: Error) {
    const entry = this.formatLogEntry('ERROR', message, error);
    this.writeToLog(entry);
  }

  public logDebug(message: string) {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.formatLogEntry('DEBUG', message);
      this.writeToLog(entry);
    }
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
    return this.logFilePath;
  }

  public getLogsDirectory(): string {
    return join(app.getPath('userData'), 'logs');
  }
}
