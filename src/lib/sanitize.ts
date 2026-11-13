import sanitizeHtml from 'sanitize-html';

export { extractTextFromMarkdown } from './sanitize/markdown-text';

export const getSanitizeHtml = (html: string) => {
  return sanitizeHtml(html, {
    textFilter: (text) =>
      text.replace(
        /[^\t\n\r\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm,
        '',
      ),
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      // Restrict img src to safe protocols only \u2014 prevents javascript: URI injection
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    },
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
  });
};
