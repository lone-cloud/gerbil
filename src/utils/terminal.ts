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

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

const linkifyText = (text: string): string =>
  text.replace(URL_REGEX, (url) => {
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    const trailingPunctuation = url.slice(cleanUrl.length);

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #339af0; text-decoration: underline; cursor: pointer;">${cleanUrl}</a>${trailingPunctuation}`;
  });

const escapeHtmlExceptLinks = (text: string): string => {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return linkifyText(escaped);
};

export const processTerminalContent = (content: string): string => {
  if (!content) return '';

  return escapeHtmlExceptLinks(content);
};
