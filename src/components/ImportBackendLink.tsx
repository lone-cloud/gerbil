import { useState } from 'react';
import { Text, Anchor } from '@mantine/core';

interface ImportBackendLinkProps {
  disabled?: boolean;
  onSuccess: () => void | Promise<void>;
  onImportingChange?: (importing: boolean) => void;
}

export const ImportBackendLink = ({
  disabled = false,
  onSuccess,
  onImportingChange,
}: ImportBackendLinkProps) => {
  const [importing, setImporting] = useState(false);

  const updateImporting = (value: boolean) => {
    setImporting(value);
    onImportingChange?.(value);
  };
  const [importError, setImportError] = useState<string | null>(null);

  const isDisabled = disabled || importing;

  const handleImport = async () => {
    setImportError(null);
    updateImporting(true);

    try {
      const result = await window.electronAPI.kobold.importLocalBackend();

      if (result.success) {
        await onSuccess();
      } else if (result.error) {
        setImportError(result.error);
      }
    } finally {
      updateImporting(false);
    }
  };

  return (
    <>
      {importError && (
        <Text size="sm" c="red" ta="center" mb="xs">
          {importError}
        </Text>
      )}
      <Text size="sm" c="dimmed" ta="center">
        Already have a backend downloaded?{' '}
        <Anchor
          component="button"
          type="button"
          size="sm"
          disabled={isDisabled}
          onClick={handleImport}
        >
          {importing ? 'Importing...' : 'Select a local file'}
        </Anchor>
      </Text>
    </>
  );
};
