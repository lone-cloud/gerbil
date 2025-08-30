export class Logger {
  private static logError(message: string, error: Error): void {
    if (window.electronAPI?.logs?.logError) {
      window.electronAPI.logs.logError(message, error);
    }
  }

  static async safeExecute<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return operation();
    } catch (error) {
      this.logError(errorMessage, error as Error);
      return null;
    }
  }

  static safeExecuteSync<T>(
    operation: () => T,
    errorMessage: string
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.logError(errorMessage, error as Error);
      return null;
    }
  }

  static async tryExecute(
    operation: () => Promise<void>,
    errorMessage: string
  ): Promise<boolean> {
    try {
      await operation();
      return true;
    } catch (error) {
      this.logError(errorMessage, error as Error);
      return false;
    }
  }

  static withErrorHandling<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    errorMessage: string
  ): (...args: TArgs) => Promise<TReturn | null> {
    return async (...args: TArgs) =>
      this.safeExecute(() => fn(...args), errorMessage);
  }

  static error(message: string, error: Error): void {
    this.logError(message, error);
  }
}
