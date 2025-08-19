import { useChangeTracker } from '@/hooks/useChangeTracker';

interface TrackedConfigHandlersProps {
  setHasUnsavedChanges: (value: boolean) => void;
  handlers: {
    handleModelPathChange: (path: string) => void;
    handleGpuLayersChange: (layers: number) => void;
    handleAutoGpuLayersChange: (auto: boolean) => void;
    handleContextSizeChangeWithStep: (size: number) => void;
    handleAdditionalArgumentsChange: (args: string) => void;
    handlePortChange: (port: number | undefined) => void;
    handleHostChange: (host: string) => void;
    handleMultiuserChange: (enabled: boolean) => void;
    handleMultiplayerChange: (enabled: boolean) => void;
    handleRemotetunnelChange: (enabled: boolean) => void;
    handleNocertifyChange: (enabled: boolean) => void;
    handleWebsearchChange: (enabled: boolean) => void;
    handleNoshiftChange: (enabled: boolean) => void;
    handleFlashattentionChange: (enabled: boolean) => void;
    handleNoavx2Change: (enabled: boolean) => void;
    handleFailsafeChange: (enabled: boolean) => void;
    handleLowvramChange: (enabled: boolean) => void;
    handleQuantmatmulChange: (enabled: boolean) => void;
    handleBackendChange: (backend: string) => void;
    handleSdmodelChange: (path: string) => void;
    handleSdt5xxlChange: (path: string) => void;
    handleSdcliplChange: (path: string) => void;
    handleSdclipgChange: (path: string) => void;
    handleSdphotomakerChange: (path: string) => void;
    handleSdvaeChange: (path: string) => void;
    handleSdloraChange: (path: string) => void;
  };
}

export const useTrackedConfigHandlers = ({
  setHasUnsavedChanges,
  handlers,
}: TrackedConfigHandlersProps) => {
  const createChangeTracker = useChangeTracker;

  const {
    handleModelPathChange,
    handleGpuLayersChange,
    handleAutoGpuLayersChange,
    handleContextSizeChangeWithStep,
    handleAdditionalArgumentsChange,
    handlePortChange,
    handleHostChange,
    handleMultiuserChange,
    handleMultiplayerChange,
    handleRemotetunnelChange,
    handleNocertifyChange,
    handleWebsearchChange,
    handleNoshiftChange,
    handleFlashattentionChange,
    handleNoavx2Change,
    handleFailsafeChange,
    handleLowvramChange,
    handleQuantmatmulChange,
    handleBackendChange,
    handleSdmodelChange,
    handleSdt5xxlChange,
    handleSdcliplChange,
    handleSdclipgChange,
    handleSdphotomakerChange,
    handleSdvaeChange,
    handleSdloraChange,
  } = handlers;

  return {
    handleModelPathChangeWithTracking: createChangeTracker(
      handleModelPathChange,
      setHasUnsavedChanges
    ),
    handleGpuLayersChangeWithTracking: createChangeTracker(
      handleGpuLayersChange,
      setHasUnsavedChanges
    ),
    handleAutoGpuLayersChangeWithTracking: createChangeTracker(
      handleAutoGpuLayersChange,
      setHasUnsavedChanges
    ),
    handleContextSizeChangeWithTracking: createChangeTracker(
      handleContextSizeChangeWithStep,
      setHasUnsavedChanges
    ),
    handleAdditionalArgumentsChangeWithTracking: createChangeTracker(
      handleAdditionalArgumentsChange,
      setHasUnsavedChanges
    ),
    handlePortChangeWithTracking: createChangeTracker(
      handlePortChange,
      setHasUnsavedChanges
    ),
    handleHostChangeWithTracking: createChangeTracker(
      handleHostChange,
      setHasUnsavedChanges
    ),
    handleNoshiftChangeWithTracking: createChangeTracker(
      handleNoshiftChange,
      setHasUnsavedChanges
    ),
    handleFlashattentionChangeWithTracking: createChangeTracker(
      handleFlashattentionChange,
      setHasUnsavedChanges
    ),
    handleNoavx2ChangeWithTracking: createChangeTracker(
      handleNoavx2Change,
      setHasUnsavedChanges
    ),
    handleFailsafeChangeWithTracking: createChangeTracker(
      handleFailsafeChange,
      setHasUnsavedChanges
    ),
    handleLowvramChangeWithTracking: createChangeTracker(
      handleLowvramChange,
      setHasUnsavedChanges
    ),
    handleQuantmatmulChangeWithTracking: createChangeTracker(
      handleQuantmatmulChange,
      setHasUnsavedChanges
    ),
    handleMultiuserChangeWithTracking: createChangeTracker(
      handleMultiuserChange,
      setHasUnsavedChanges
    ),
    handleMultiplayerChangeWithTracking: createChangeTracker(
      handleMultiplayerChange,
      setHasUnsavedChanges
    ),
    handleRemotetunnelChangeWithTracking: createChangeTracker(
      handleRemotetunnelChange,
      setHasUnsavedChanges
    ),
    handleNocertifyChangeWithTracking: createChangeTracker(
      handleNocertifyChange,
      setHasUnsavedChanges
    ),
    handleWebsearchChangeWithTracking: createChangeTracker(
      handleWebsearchChange,
      setHasUnsavedChanges
    ),
    handleBackendChangeWithTracking: createChangeTracker(
      handleBackendChange,
      setHasUnsavedChanges
    ),
    handleSdmodelChangeWithTracking: createChangeTracker(
      handleSdmodelChange,
      setHasUnsavedChanges
    ),
    handleSdt5xxlChangeWithTracking: createChangeTracker(
      handleSdt5xxlChange,
      setHasUnsavedChanges
    ),
    handleSdcliplChangeWithTracking: createChangeTracker(
      handleSdcliplChange,
      setHasUnsavedChanges
    ),
    handleSdclipgChangeWithTracking: createChangeTracker(
      handleSdclipgChange,
      setHasUnsavedChanges
    ),
    handleSdphotomakerChangeWithTracking: createChangeTracker(
      handleSdphotomakerChange,
      setHasUnsavedChanges
    ),
    handleSdvaeChangeWithTracking: createChangeTracker(
      handleSdvaeChange,
      setHasUnsavedChanges
    ),
    handleSdloraChangeWithTracking: createChangeTracker(
      handleSdloraChange,
      setHasUnsavedChanges
    ),
  };
};
