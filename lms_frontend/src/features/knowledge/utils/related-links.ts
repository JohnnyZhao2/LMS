import type { RelatedLink } from '@/types/knowledge';

export const EMPTY_RELATED_LINK: RelatedLink = { title: '', url: '' };

/** 过滤空链接并 trim */
export function sanitizeRelatedLinks(relatedLinks: RelatedLink[]): RelatedLink[] {
  return relatedLinks.flatMap((link) => {
    const url = link.url.trim();
    return url ? [{ title: link.title?.trim() ?? '', url }] : [];
  });
}

/** 比较两组相关链接是否一致 */
export function hasSameRelatedLinks(left: RelatedLink[], right: RelatedLink[]): boolean {
  const normalizedLeft = sanitizeRelatedLinks(left);
  const normalizedRight = sanitizeRelatedLinks(right);
  return (
    normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((link, index) => (
      link.url === normalizedRight[index]?.url
      && (link.title ?? '') === (normalizedRight[index]?.title ?? '')
    ))
  );
}

/** 校验编辑中的相关链接草稿，合法返回 null */
export function getRelatedLinksDraftError(relatedLinks: RelatedLink[]): string | null {
  for (const link of relatedLinks) {
    const title = link.title?.trim() ?? '';
    const url = link.url.trim();
    if (!title && !url) continue;
    if (!url) return '请填写链接地址';
    try {
      new URL(url);
    } catch {
      return '链接地址格式不正确';
    }
  }
  return null;
}

/** 侧栏展示用短文本 */
export function getRelatedLinkDisplayText(link: RelatedLink): string {
  const text = link.title?.trim()
    || link.url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    || '相关链接';
  return text.length <= 42 ? text : `${text.slice(0, 42).trimEnd()}...`;
}
