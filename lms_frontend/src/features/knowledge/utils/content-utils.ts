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
 * 提取内容中的第一个标题
 */
export function getH(html: string): string | null {
  const m = html.match(/<h[123][^>]*>(.*?)<\/h[123]>/i);
  return m ? plain(m[1]) : null;
}

/**
 * 提取内容中的第一个一级标题，作为知识主题
 */
export function getKnowledgeTitleFromHtml(html: string): string {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match ? plain(match[1]) : '';
}

/**
 * Bionic Reading - 只对英文单词前 60% 加粗显示
 * 保护 HTML 实体（如 &nbsp; &lt; &gt; 等）不被处理
 */
export function bionicHtml(html: string): string {
  return html.replace(/(<[^>]+>)|(&[a-zA-Z]+;)|([a-zA-Z]{3,})/g, (_match, tag, entity, word) => {
    if (tag) return tag;
    if (entity) return entity;
    const n = Math.ceil(word.length * 0.6);
    return `<b style="font-weight:800;color:#111">${word.slice(0, n)}</b><span style="color:#aaa">${word.slice(n)}</span>`;
  });
}
