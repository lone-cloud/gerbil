import { logError } from '@/main/modules/logging';
import {
  createSafeExecute,
  createTryExecute,
  createSafeTryExecute,
} from '@/utils/shared/logger-core';

export const safeExecute = createSafeExecute(logError);
export const tryExecute = createTryExecute(logError);
export const safeTryExecute = createSafeTryExecute(logError);
