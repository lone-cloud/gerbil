export const logError = (message: string, error: Error) => {
  window.electronAPI.logs.logError(message, error);
};

export const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delayMs = 3000) => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

export const safeExecute = async <T>(operation: () => Promise<T>, errorMessage: string) => {
  try {
    return await operation();
  } catch (error) {
    logError(errorMessage, error as Error);
    return null;
  }
};
