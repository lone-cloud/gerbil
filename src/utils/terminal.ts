import stripAnsi from 'strip-ansi';

export const handleTerminalOutput = (
  prevContent: string,
  newData: string
): string => {
  try {
    const cleanData = stripAnsi(newData);

    if (cleanData.includes('\r')) {
      const lines = (prevContent + cleanData).split('\n');
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

    return prevContent + cleanData;
  } catch (error) {
    window.electronAPI.logs.logError('Terminal Basic Error', error as Error);
    return prevContent + newData;
  }
};
