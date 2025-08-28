const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

export const linkifyText = (text: string): string =>
  text.replace(URL_REGEX, (url) => {
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    const trailingPunctuation = url.slice(cleanUrl.length);

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #339af0; text-decoration: underline; cursor: pointer;">${cleanUrl}</a>${trailingPunctuation}`;
  });

export const escapeHtmlExceptLinks = (text: string): string => {
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
