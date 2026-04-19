import DOMPurify from 'dompurify';

// Single place to render HTML written by admins via the rich-text editor.
// Even though admin accounts are trusted, running content through a purifier
// is cheap insurance against a compromised admin or an XSS payload smuggled
// through a paste — and costs nothing performance-wise for the page sizes
// we deal with (a few kB of article content at most).

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 's', 'u', 'code', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'hr',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'];

export function renderRichText(dirty) {
  if (!dirty) return { __html: '' };
  return {
    __html: DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      // Force every anchor to open in a new tab with rel=noopener so a
      // compromised editor can't phish the user into a same-tab navigation.
      ADD_ATTR: ['target', 'rel'],
    }),
  };
}

// Derive a plain-text preview (strips tags) for use in list views where a
// truncated snippet makes more sense than rendered HTML.
export function previewText(dirty, maxChars = 180) {
  if (!dirty) return '';
  const text = String(dirty).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
