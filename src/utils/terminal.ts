export const handleTerminalOutput = (prevContent: string, newData: string) => {
  if (newData.startsWith('\r') && !newData.startsWith('\r\n')) {
    const lines = prevContent.split('\n');
    lines[lines.length - 1] = newData.slice(1);
    return lines.join('\n');
  }

  return prevContent + newData;
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
