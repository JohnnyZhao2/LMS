/**
 * 步骤摘要工具：仅支持换行与加粗（strong/b/br）
 */

/** 将 HTML 转为纯文本 */
export function plain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const STEPS_ALLOWED_TAG_RE = /<(\/?(?:br|strong|b))\b[^<>]*>/gi;
const STEPS_PLACEHOLDERS: Record<string, string> = {
  br: '\0BR\0',
  strong: '\0STRONG_OPEN\0',
  b: '\0STRONG_OPEN\0',
  '/strong': '\0STRONG_CLOSE\0',
  '/b': '\0STRONG_CLOSE\0',
};

/** 清洗步骤摘要，仅保留裸 br / strong（剥掉全部属性，防 XSS） */
export function sanitizeStepsHtml(html: string): string {
  const withBreaks = (html || '')
    .replace(/\0/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/p\s*>/gi, '<br>')
    .replace(/<p\b[^<>]*>/gi, '')
    .replace(/<div\b[^<>]*>/gi, '')
    .replace(/<\/div\s*>/gi, '<br>');

  return withBreaks
    .replace(STEPS_ALLOWED_TAG_RE, (_, tag: string) => STEPS_PLACEHOLDERS[tag.toLowerCase()] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-zA-Z!?][^<>]*>/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\0BR\0/g, '<br>')
    .replace(/\0STRONG_OPEN\0/g, '<strong>')
    .replace(/\0STRONG_CLOSE\0/g, '</strong>')
    .replace(/(?:<br>\s*)+$/i, '')
    .trim();
}

/** 构建文档 iframe URL；编辑模式追加 mode=edit */
export function buildDocUrl(url: string, mode: 'view' | 'edit' = 'view'): string {
  const base = (url || '').trim();
  if (!base || mode === 'view') return base;
  return base.includes('?') ? `${base}&mode=edit` : `${base}?mode=edit`;
}
