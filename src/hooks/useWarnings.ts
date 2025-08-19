import { useMemo } from 'react';

interface UseWarningsProps {
  modelPath: string;
  sdmodel: string;
  warnings: Array<{ type: 'warning' | 'info'; message: string }>;
}

export const useWarnings = ({
  modelPath,
  sdmodel,
  warnings,
}: UseWarningsProps) =>
  useMemo(() => {
    const hasTextModel = modelPath?.trim() !== '';
    const hasImageModel = sdmodel.trim() !== '';
    const showModelPriorityWarning = hasTextModel && hasImageModel;
    const showNoModelWarning = !hasTextModel && !hasImageModel;

    return [
      ...warnings,
      ...(showModelPriorityWarning
        ? [
            {
              type: 'warning' as const,
              message:
                'Both text and image generation models are selected. The image generation model will take priority and be used for launch.',
            },
          ]
        : []),
      ...(showNoModelWarning
        ? [
            {
              type: 'info' as const,
              message:
                'Select a model in the General or Image Generation tab to enable launch.',
            },
          ]
        : []),
    ];
  }, [modelPath, sdmodel, warnings]);
