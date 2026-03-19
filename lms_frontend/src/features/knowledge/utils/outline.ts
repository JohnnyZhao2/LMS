/**
 * 目录项接口
 */
export interface OutlineItem {
    id: string;
    level: number;
    text: string;
}

/**
 * 从 HTML 内容解析标题生成目录
 */
export function parseOutlineFromHtml(html: string): OutlineItem[] {
    if (!html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');

    return Array.from(headings).map((heading, index) => ({
        id: `heading-${index}`,
        level: parseInt(heading.tagName.charAt(1), 10),
        text: heading.textContent || '',
    }));
}

/**
 * 从内容解析目录
 */
export function parseOutline(content: string): OutlineItem[] {
    return parseOutlineFromHtml(content);
}
