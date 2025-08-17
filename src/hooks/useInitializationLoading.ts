import { useState, useEffect } from 'react';

export const useInitializationLoading = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationStep, setInitializationStep] = useState<string>(
    'Detecting system capabilities...'
  );

  const updateStep = (step: string) => {
    setInitializationStep(step);
  };

  const completeInitialization = () => {
    setIsInitializing(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isInitializing) {
        window.electronAPI.logs.logError(
          'Initialization timeout reached, forcing completion',
          new Error('Initialization timeout')
        );
        completeInitialization();
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isInitializing]);

  return {
    isInitializing,
    initializationStep,
    updateStep,
    completeInitialization,
  };
};
