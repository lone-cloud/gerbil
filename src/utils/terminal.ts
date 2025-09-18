import { safeTryExecute } from '@/utils/logger';

export const handleTerminalOutput = (prevContent: string, newData: string) => {
  const result = safeTryExecute(() => {
    if (newData.includes('\r')) {
      const hasStandaloneCarriageReturns = /\r(?!\n)/g.test(newData);

      if (hasStandaloneCarriageReturns) {
        const combined = prevContent + newData;

        const lines = combined.split(/(\r?\n)/);
        const processedLines: string[] = [];

        for (let i = 0; i < lines.length; i += 2) {
          const line = lines[i] || '';
          const lineBreak = lines[i + 1] || '';

          if (line.includes('\r')) {
            const parts = line.split('\r');
            processedLines.push(parts[parts.length - 1] + lineBreak);
          } else {
            processedLines.push(line + lineBreak);
          }
        }

        return processedLines.join('').replace(/\r?\n$/, '');
      }
    }

    return prevContent + newData;
  }, 'Terminal Basic Error');

  return result ?? prevContent + newData;
};

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

const linkifyText = (text: string) =>
  text.replace(URL_REGEX, (url) => {
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    const trailingPunctuation = url.slice(cleanUrl.length);

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #339af0; text-decoration: underline; cursor: pointer;">${cleanUrl}</a>${trailingPunctuation}`;
  });

const escapeHtmlExceptLinks = (text: string) => {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return linkifyText(escaped);
};

export const processTerminalContent = (content: string) => {
  if (!content) return '';

  return escapeHtmlExceptLinks(content);
};
