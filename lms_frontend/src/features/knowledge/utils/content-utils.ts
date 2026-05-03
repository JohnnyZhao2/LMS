/**
 * 将 HTML 转换为纯文本
 */
export function plain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 判断是否为长内容
 * 长内容：包含标题标签（h1/h2/h3）或纯文本超过 160 字符
 */
export function isLong(html: string): boolean {
  return /<h[123]/.test(html) || plain(html).length > 160;
}

/**
 * 提取内容中的第一个一级标题，作为知识主题
 */
export function getKnowledgeTitleFromHtml(html: string): string {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match ? plain(match[1]) : '';
}
