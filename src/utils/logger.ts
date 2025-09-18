import {
  createSafeExecute,
  createTryExecute,
  createTryExecuteImmediate,
} from '@/utils/shared/logger-core';

export const logError = (message: string, error: Error) => {
  window.electronAPI.logs.logError(message, error);
};

export const safeExecute = createSafeExecute(logError);
export const tryExecute = createTryExecute(logError);
export const tryExecuteImmediate = createTryExecuteImmediate(logError);
