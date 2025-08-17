import { useCallback } from 'react';

export const useChangeTracker = <T extends unknown[]>(
  handler: (...args: T) => void,
  setHasUnsavedChanges: (value: boolean) => void
) =>
  useCallback(
    (...args: T) => {
      handler(...args);
      setHasUnsavedChanges(true);
    },
    [handler, setHasUnsavedChanges]
  );
