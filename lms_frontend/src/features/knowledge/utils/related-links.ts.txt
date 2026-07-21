import type { RelatedLink } from '@/types/knowledge';

const RELATED_LINK_DISPLAY_MAX_LENGTH = 42;

export function createEmptyRelatedLink(): RelatedLink {
  return {
    title: '',
    url: '',
  };
}

export function sanitizeRelatedLinks(relatedLinks: RelatedLink[]): RelatedLink[] {
  return relatedLinks.reduce<RelatedLink[]>((accumulator, link) => {
    const url = link.url.trim();
    if (!url) {
      return accumulator;
    }

    accumulator.push({
      title: link.title?.trim() ?? '',
      url,
    });
    return accumulator;
  }, []);
}

function normalizeRelatedLinkUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function truncateRelatedLinkText(text: string): string {
  if (text.length <= RELATED_LINK_DISPLAY_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, RELATED_LINK_DISPLAY_MAX_LENGTH).trimEnd()}...`;
}

export function getRelatedLinkDisplayText(link: RelatedLink): string {
  const title = link.title?.trim();
  if (title) {
    return truncateRelatedLinkText(title);
  }

  return truncateRelatedLinkText(normalizeRelatedLinkUrl(link.url) || '相关链接');
}
