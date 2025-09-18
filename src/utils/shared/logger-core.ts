type LoggerFunction = (message: string, error: Error) => void;

export const createSafeExecute =
  (logger: LoggerFunction) =>
  async <T>(operation: () => Promise<T>, errorMessage: string) => {
    try {
      return operation();
    } catch (error) {
      logger(errorMessage, error as Error);
      return null;
    }
  };

export const createTryExecute =
  (logger: LoggerFunction) =>
  async (operation: () => Promise<void>, errorMessage: string) => {
    try {
      await operation();
      return true;
    } catch (error) {
      logger(errorMessage, error as Error);
      return false;
    }
  };

export const createSafeTryExecute =
  (logger: LoggerFunction) =>
  <T>(operation: () => T, errorMessage: string) => {
    try {
      return operation();
    } catch (error) {
      logger(errorMessage, error as Error);
      return null;
    }
  };

export const createTryExecuteImmediate =
  (logger: LoggerFunction) => (operation: () => void, errorMessage: string) => {
    try {
      operation();
      return true;
    } catch (error) {
      logger(errorMessage, error as Error);
      return false;
    }
  };
