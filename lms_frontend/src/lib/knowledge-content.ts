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
  let text = (html || '').replace(/\0/g, '');
  while (true) {
    const stripped = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    if (stripped === text) break;
    text = stripped;
  }

  const withBreaks = text
    .replace(/<!--[\s\S]*?-->/g, '')
    // 先剥除非白名单标签（暂留 div/p/br/strong/b），避免夹杂标签导致 </p> 与 <div> 重复生成 <br>
    .replace(/<\/?(?!(?:div|p|br|strong|b)\b)[a-zA-Z!?][^<>]*>/gi, '')
    // Chrome contentEditable 空行会生成 <div><br></div>，先归一化避免双换行
    .replace(/<(div|p)\b[^<>]*>\s*<br\s*\/?>\s*<\/\1\s*>/gi, '<$1></$1>')
    // 块级结束标签后面紧跟裸文本时补换行
    .replace(/<\/(?:div|p)\s*>(?!\s*(?:<(?:div|p|br)\b|$))/gi, '<br>')
    .replace(/<\/(?:div|p)\s*>/gi, '')
    .replace(/^\s*<(?:div|p)\b[^<>]*>/i, '')
    .replace(/<(?:div|p)\b[^<>]*>/gi, '<br>');

  return withBreaks
    .replace(STEPS_ALLOWED_TAG_RE, (_, tag: string) => STEPS_PLACEHOLDERS[tag.toLowerCase()] ?? '')
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

/**
 * 识别逗号/顿号分隔的多项短值（如多人授权、多负责人），不误拆长句。
 * 命中时返回去重后的短项数组，否则返回 null。
 */
export function parseMultiValueExtraField(value: string): string[] | null {
  const raw = (value || '').trim();
  if (!raw || /[\n。！？!?]/.test(raw)) return null;
  if (!/[,，、;；]/.test(raw)) return null;
  const parts = Array.from(
    new Set(raw.split(/[,，、;；]/).map((p) => p.trim()).filter(Boolean)),
  );
  if (parts.length < 2) return null;
  if (parts.some((p) => p.length > 16)) return null;
  return parts;
}
