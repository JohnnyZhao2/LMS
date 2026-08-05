import type { RelatedLink } from '@/types/knowledge';

/** 过滤空链接并 trim */
export function sanitizeRelatedLinks(relatedLinks: RelatedLink[]): RelatedLink[] {
  return relatedLinks.flatMap((link) => {
    const url = link.url.trim();
    return url ? [{ title: link.title?.trim() ?? '', url }] : [];
  });
}

/** 侧栏展示用短文本 */
export function getRelatedLinkDisplayText(link: RelatedLink): string {
  const text = link.title?.trim()
    || link.url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    || '相关链接';
  return text.length <= 42 ? text : `${text.slice(0, 42).trimEnd()}...`;
}
