import { SPACES } from './constants';

export function bionicHtml(html) {
  return html.replace(/(<[^>]+>)|([a-zA-Z]{3,})/g, (match, tag, word) => {
    if (tag) return tag;
    const n = Math.ceil(word.length * 0.6);
    return `<b style="font-weight:800;color:#111">${word.slice(0, n)}</b><span style="color:#aaa">${word.slice(n)}</span>`;
  });
}

export function spaceColor(spaceId) {
  return SPACES.find(s => s.id === spaceId)?.color || "#aaa";
}

export function plain(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function isLong(html) {
  return /<h[123]/.test(html) || plain(html).length > 160;
}

export function getH(html) {
  const m = html.match(/<h[123][^>]*>(.*?)<\/h[123]>/i);
  return m ? plain(m[1]) : null;
}

export function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}
