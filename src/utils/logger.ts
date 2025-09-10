export const logError = (message: string, error: Error) => {
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
