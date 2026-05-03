export type SlashShortcutId = 'heading' | 'divider' | 'blockquote' | 'code_block';

export interface SlashShortcut {
  id: SlashShortcutId;
  label: string;
  keywords: string[];
}

export interface SlashTrigger {
  start: number;
  end: number;
  query: string;
}

const DIVIDER_MARKERS = new Set(['---', '***', '___']);

const SLASH_SHORTCUTS: SlashShortcut[] = [
  {
    id: 'heading',
    label: '标题',
    keywords: ['heading', 'h1', 'title', '标题'],
  },
  {
    id: 'divider',
    label: '分割线',
    keywords: ['divider', 'line', 'hr', '分割线'],
  },
  {
    id: 'blockquote',
    label: '块引用',
    keywords: ['blockquote', 'quote', '引用', '块引用'],
  },
  {
    id: 'code_block',
    label: '代码块',
    keywords: ['code', 'codeblock', '代码', '代码块'],
  },
];

export function detectSlashTrigger(value: string, cursor: number): SlashTrigger | null {
  const safeCursor = Math.max(0, Math.min(cursor, value.length));
  const lineStart = value.lastIndexOf('\n', safeCursor - 1) + 1;
  const lineBeforeCursor = value.slice(lineStart, safeCursor);
  const match = lineBeforeCursor.match(/(^|\s)\/([^\s/]*)$/);
  if (!match) return null;

  const slashOffset = lineBeforeCursor.lastIndexOf('/');
  if (slashOffset < 0) return null;

  return {
    start: lineStart + slashOffset,
    end: safeCursor,
    query: match[2] ?? '',
  };
}

export function filterSlashShortcuts(query: string): SlashShortcut[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return SLASH_SHORTCUTS;

  return SLASH_SHORTCUTS.filter((shortcut) => (
    shortcut.label.includes(normalizedQuery) ||
    shortcut.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))
  ));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildParagraph(text: string): string {
  return `<p>${escapeHtml(text)}</p>`;
}

function buildList(items: string[], tagName: 'ol' | 'ul'): string {
  return `<${tagName}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tagName}>`;
}

export function textToKnowledgeHtml(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i += 1;
      }
      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    if (DIVIDER_MARKERS.has(trimmed)) {
      blocks.push('<hr />');
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
      i += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(buildList(items, 'ol'));
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(buildList(items, 'ul'));
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteBlocks: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        const quoteLine = lines[i].slice(2);
        quoteBlocks.push(quoteLine.trim() ? buildParagraph(quoteLine) : '<p><br></p>');
        i += 1;
      }
      blocks.push(`<blockquote>${quoteBlocks.join('')}</blockquote>`);
      continue;
    }

    if (!trimmed) {
      blocks.push('<p><br></p>');
      i += 1;
      continue;
    }

    blocks.push(buildParagraph(line));
    i += 1;
  }

  return blocks.join('');
}

export function hasMeaningfulKnowledgeHtml(html: string): boolean {
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  if (plain.length > 0) return true;
  return /<(hr|img|pre|blockquote)\b/i.test(html);
}
