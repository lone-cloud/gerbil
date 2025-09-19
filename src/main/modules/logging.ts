import { app } from 'electron';
import { join } from 'path';
import { createLogger, format, type Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { isDevelopment } from '@/utils/node/environment';

let logger: Logger | null = null;
let isInitialized = false;

export const initializeLogger = () => {
  if (isInitialized) return;

  const logsDir = join(app.getPath('userData'), 'logs');

  logger = createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, level, message, error }) => {
        let logEntry = `${timestamp} [MAIN] [${level.toUpperCase()}] ${message}`;

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
      new DailyRotateFile({
        filename: join(logsDir, 'gerbil-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '5d',
        createSymlink: true,
        symlinkName: 'gerbil.log',
      }),
    ],
  });

  isInitialized = true;
};

const ensureInitialized = () => {
  if (!isInitialized) {
    initializeLogger();
  }
};

export const logError = (message: string, error?: Error) => {
  ensureInitialized();
  logger!.error(message, { error });
  flushLogs();
};

export const flushLogs = () => {
  ensureInitialized();
  const fileTransport = logger!.transports.find(
    (t) => t.constructor.name === 'DailyRotateFile'
  );
  if (
    fileTransport &&
    'flush' in fileTransport &&
    typeof fileTransport.flush === 'function'
  ) {
    (fileTransport as { flush: () => void }).flush();
  }
};

export const getLogFilePath = () =>
  join(app.getPath('userData'), 'logs', 'gerbil.log');

export const getLogsDirectory = () => join(app.getPath('userData'), 'logs');
