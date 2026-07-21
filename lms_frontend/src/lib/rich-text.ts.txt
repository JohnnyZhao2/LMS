const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeHtmlEntity(entity: string): string {
  const normalized = entity.toLowerCase();

  if (normalized.startsWith('#x')) {
    const codePoint = Number.parseInt(normalized.slice(2), 16);
    return Number.isNaN(codePoint) ? `&${entity};` : String.fromCodePoint(codePoint);
  }

  if (normalized.startsWith('#')) {
    const codePoint = Number.parseInt(normalized.slice(1), 10);
    return Number.isNaN(codePoint) ? `&${entity};` : String.fromCodePoint(codePoint);
  }

  return HTML_ENTITY_MAP[normalized] ?? `&${entity};`;
}

function decodeHtmlEntities(value: string): string {
  if (!value) return '';
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => decodeHtmlEntity(entity));
}

export function richTextToPlainText(
  value: string,
  options: { preserveLineBreaks?: boolean } = {},
): string {
  if (!value) return '';

  const { preserveLineBreaks = true } = options;
  const normalized = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|blockquote|pre|h[1-6]|tr|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const decoded = decodeHtmlEntities(normalized)
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '');

  if (!preserveLineBreaks) {
    return decoded.replace(/\s+/g, ' ').trim();
  }

  return decoded
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function richTextToPreviewText(value: string): string {
  return richTextToPlainText(value, { preserveLineBreaks: false });
}
