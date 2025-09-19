import {
  createSafeExecute,
  createTryExecute,
  createTryExecuteImmediate,
  createSafeTryExecute,
} from '@/utils/logger-core';

export const logError = (message: string, error: Error) => {
  window.electronAPI.logs.logError(message, error);
};

export const safeExecute = createSafeExecute(logError);
export const tryExecute = createTryExecute(logError);
export const tryExecuteImmediate = createTryExecuteImmediate(logError);
export const safeTryExecute = createSafeTryExecute(logError);
