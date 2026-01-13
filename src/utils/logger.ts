export const logError = (message: string, error: Error) => {
  window.electronAPI.logs.logError(message, error);
};

export const safeExecute = async <T>(operation: () => Promise<T>, errorMessage: string) => {
  try {
    return operation();
  } catch (error) {
    logError(errorMessage, error as Error);
    return null;
  }
};
