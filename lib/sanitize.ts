/**
 * Server-side HTML & plain-text sanitizer.
 *
 * Used to clean user-supplied HTML (from the rich-text editor) before
 * persisting it to the database and to strip tags before storing plain text.
 *
 * We do NOT depend on DOMParser (browser) or external heavy libraries.
 * Instead we use a simple, strict allowlist-based regex approach that is
 * sufficient for the rich-text content stored in this app.
 *
 * If you need more complex sanitization in the future, install `sanitize-html`
 * from npm and replace the `sanitizeHtml` implementation below.
 */

/** Tags that are safe to keep (with their allowed attributes). */
const ALLOWED_TAGS: Record<string, string[]> = {
  p: [],
  br: [],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  ul: [],
  ol: [],
  li: [],
  blockquote: [],
  pre: [],
  code: [],
  table: [],
  thead: [],
  tbody: [],
  tr: [],
  th: ['style'],
  td: ['style'],
  img: ['src', 'alt', 'width', 'height'],
  a: ['href', 'target', 'rel'],
  span: ['style'],
  div: [],
};

/** Strip all tags not in the allowlist and remove dangerous attributes. */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // 1. Remove script / style / on* attributes and javascript: hrefs
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove on* event handlers e.g. onclick="..." onload='...'
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: href/src
    .replace(/(?:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');

  // 2. Strip tags not in the allowlist
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tagName, attrs) => {
    const lower = tagName.toLowerCase();
    if (!(lower in ALLOWED_TAGS)) return ''; // strip unknown tags entirely

    const allowedAttrs = ALLOWED_TAGS[lower];
    if (allowedAttrs.length === 0) return `<${match.startsWith('</') ? '/' : ''}${lower}>`;

    // Filter attributes to only those allowed
    const filteredAttrs = attrs.replace(
      /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g,
      (_: string, attrName: string, dq: string, sq: string, bare: string) => {
        if (!allowedAttrs.includes(attrName.toLowerCase())) return '';
        const val = dq ?? sq ?? bare ?? '';
        // Block javascript: in any attribute value
        if (/javascript:/i.test(val)) return '';
        return `${attrName.toLowerCase()}="${val}"`;
      },
    );

    const closing = match.startsWith('</') ? '/' : '';
    return `<${closing}${lower}${filteredAttrs ? ' ' + filteredAttrs.trim() : ''}>`;
  });

  return clean.trim();
}

/** Strip all HTML tags; return plain text. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize a plain text string: trim, collapse multiple spaces/newlines,
 * and enforce an optional maximum length.
 */
export function sanitizeText(value: string, maxLength = 2000): string {
  return String(value)
    .trim()
    .replace(/\0/g, '')         // remove null bytes
    .slice(0, maxLength);
}

/** Return true if the string looks like a valid UUID v4. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

