export const handleTerminalOutput = (
  prevContent: string,
  newData: string
): string => {
  try {
    if (newData.includes('\r') && !newData.includes('\r\n')) {
      const lines = (prevContent + newData).split('\n');

      return lines
        .map((line) => {
          if (line.includes('\r')) {
            const parts = line.split('\r');
            return parts[parts.length - 1];
          }

          return line;
        })
        .join('\n');
    }

    return prevContent + newData;
  } catch (error) {
    window.electronAPI.logs.logError('Terminal Basic Error', error as Error);
    return prevContent + newData;
  }
};
