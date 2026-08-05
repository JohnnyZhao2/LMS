/**
 * 步骤摘要工具：仅支持换行与加粗（strong/b/br）
 */

/** 将 HTML 转为纯文本 */
export function plain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 清洗步骤摘要，仅保留裸 br / strong（剥掉全部属性，防 XSS） */
export function sanitizeStepsHtml(html: string): string {
  const withBreaks = (html || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/p>/gi, '<br>')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '<br>');

  return withBreaks
    .replace(/<(?!\/?(?:br|strong|b)\b)[^>]+>/gi, '')
    .replace(/<br\b[^>]*>/gi, '<br>')
    .replace(/<\/?(?:strong|b)\b[^>]*>/gi, (tag) => (
      tag.startsWith('</') ? '</strong>' : '<strong>'
    ))
    .replace(/(?:<br\s*\/?\s*>\s*)+$/i, '')
    .trim();
}

/** 构建文档 iframe URL；编辑模式追加 mode=edit */
export function buildDocUrl(url: string, mode: 'view' | 'edit' = 'view'): string {
  const base = (url || '').trim();
  if (!base || mode === 'view') return base;
  return base.includes('?') ? `${base}&mode=edit` : `${base}?mode=edit`;
}
