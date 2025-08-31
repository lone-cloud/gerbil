const logError = (message: string, error: Error): void => {
  if (window.electronAPI?.logs?.logError) {
    window.electronAPI.logs.logError(message, error);
  }
};

export const safeExecute = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> => {
  try {
    return operation();
  } catch (error) {
    logError(errorMessage, error as Error);
    return null;
  }
};

export const safeExecuteSync = <T>(
  operation: () => T,
  errorMessage: string
): T | null => {
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
): Promise<boolean> => {
  try {
    await operation();
    return true;
  } catch (error) {
    logError(errorMessage, error as Error);
    return false;
  }
};

export const withErrorHandling =
  <TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    errorMessage: string
  ): ((...args: TArgs) => Promise<TReturn | null>) =>
  async (...args: TArgs) =>
    safeExecute(() => fn(...args), errorMessage);

export const error = (message: string, error: Error): void => {
  logError(message, error);
};
