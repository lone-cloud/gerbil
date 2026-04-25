export const handleTerminalOutput = (prevContent: string, newData: string) => {
  if (newData.startsWith('\r') && !newData.startsWith('\r\n')) {
    const lines = prevContent.split('\n');
    lines[lines.length - 1] = newData.slice(1);
    return lines.join('\n');
  }

  return prevContent + newData;
};

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const linkifyAndEscape = (text: string) => {
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    const rawUrl = match[0];
    const cleanUrl = rawUrl.replace(/[.,;:!?]+$/, '');
    const trailingPunctuation = rawUrl.slice(cleanUrl.length);
    parts.push(
      `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--mantine-color-brand-5); text-decoration: underline; cursor: pointer;">${escapeHtml(cleanUrl)}</a>${escapeHtml(trailingPunctuation)}`,
    );
    lastIndex = match.index + rawUrl.length;
  }

  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join('');
};

export const processTerminalContent = (content: string) => {
  if (!content) {
    return '';
  }

  return linkifyAndEscape(content);
};
