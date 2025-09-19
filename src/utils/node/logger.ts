import { logError } from '@/main/modules/logging';

export const safeExecute = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
) => {
  try {
    return operation();
  } catch (error) {
    logError(errorMessage, error as Error);
    return null;
  }
};

export const tryExecute = async (
  operation: () => Promise<void>,
  errorMessage: string
) => {
  try {
    await operation();
    return true;
  } catch (error) {
    logError(errorMessage, error as Error);
    return false;
  }
};
