import type {
  KnowledgeBulkImportItem,
  KnowledgeBulkImportTagItem,
} from '@/features/knowledge/api/knowledge';
import type { KnowledgeExtraField, RelatedLink } from '@/types/knowledge';
import { sanitizeStepsHtml } from '@/lib/knowledge-content';
import { sanitizeRelatedLinks } from './related-links';

export type ImportTargetField =
  | 'id'
  | 'title'
  | 'section'
  | 'summary'
  | 'space'
  | 'tags'
  | 'content'
  | 'url'
  | 'related_links'
  | 'extra'
  | 'ignore';

const SINGLETON_IMPORT_FIELDS = new Set<ImportTargetField>([
  'id',
  'title',
  'section',
  'summary',
  'space',
  'content',
  'url',
  'related_links',
]);

/** 与后端 normalize_doc_key 对齐：优先 id:<doc_id>，否则去除 fragment 后的 URL */
export function extractPreviewDocKey(url: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const id = parsed.searchParams.get('id')?.trim();
    if (id) return `id:${id}`;
  } catch {
    // 非法或相对 URL 直接退回原串
  }
  return raw.split('#', 1)[0].trim();
}

export type ColumnMappingItem = {
  colIndex: number;
  header: string;
  sample: string;
  target: ImportTargetField;
  extraLabel: string;
};

export type ParsedXlsxSheet = {
  fileName: string;
  headers: string[];
  dataRows: Array<{ rowNumber: number; cells: string[] }>;
};

export type KnowledgeImportRow = {
  rowNumber: number;
  id?: number;
  title: string;
  section: string;
  summary: string;
  externalDocUrl: string;
  spaceName: string;
  tagNames: string[];
  tagItems: KnowledgeBulkImportTagItem[];
  content: string;
  extraFields: KnowledgeExtraField[];
  relatedLinks: RelatedLink[];
};

export type KnowledgeImportFailure = { rowNumber: number; reason: string };

const HEADER_ALIAS_MAP: Record<string, ImportTargetField> = {
  知识id: 'id',
  id: 'id',
  标题: 'title',
  场景名称: 'title',
  场景: 'title',
  名称: 'title',
  针对故障: 'summary',
  适用场景: 'summary',
  故障现象: 'summary',
  场景说明: 'summary',
  分组: 'section',
  所属分组: 'section',
  所属系统: 'section',
  系统: 'section',
  章节: 'section',
  space: 'space',
  空间: 'space',
  技术栈: 'space',
  标签: 'tags',
  所属类别: 'tags',
  类别: 'tags',
  分类: 'tags',
  应急对象: 'tags',
  执行平台: 'tags',
  简洁执行步骤: 'content',
  执行步骤: 'content',
  步骤摘要: 'content',
  执行路径: 'content',
  操作步骤: 'content',
  文档链接: 'url',
  原文档链接: 'url',
  链接: 'url',
  相关链接: 'related_links',
  序号: 'ignore',
  编号: 'ignore',
};

const splitCsv = (raw: string) => raw.split(/[,，、;；]/).map((p) => p.trim()).filter(Boolean);

/** 表格纯文本步骤 → 存库 HTML */
export function normalizeImportContent(raw: string): string {
  return sanitizeStepsHtml(raw.replace(/\r\n|\r|\n/g, '<br>'));
}

/** 相关链接：逗号分隔，单项 url 或 名称|url */
export function parseRelatedLinksCell(raw: string): RelatedLink[] {
  return sanitizeRelatedLinks(
    raw
      .split(/[,，\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((part) => {
        const pipe = part.indexOf('|');
        return pipe >= 0
          ? { title: part.slice(0, pipe).trim(), url: part.slice(pipe + 1).trim() }
          : { title: '', url: part };
      }),
  );
}

/** 解析 xlsx 第一张表为原始表头 + 数据行（按需动态加载 xlsx，避免拖慢知识页首屏） */
export async function readKnowledgeXlsxSheet(file: File): Promise<ParsedXlsxSheet> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('表格为空');

  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(
    workbook.Sheets[sheetName],
    { header: 1, defval: '', raw: false },
  );
  if (matrix.length < 2) throw new Error('表格至少需要表头和一行数据');

  const rawHeaders = matrix[0] ?? [];
  const headers: string[] = [];
  const validColIndices: number[] = [];
  rawHeaders.forEach((cell, idx) => {
    const text = String(cell ?? '').trim();
    if (text) {
      headers.push(text);
      validColIndices.push(idx);
    }
  });
  if (headers.length === 0) throw new Error('第一行表头为空');

  const dataRows: Array<{ rowNumber: number; cells: string[] }> = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const rawRow = matrix[i] ?? [];
    const cells = validColIndices.map((idx) => String(rawRow[idx] ?? '').trim());
    if (!cells.some(Boolean)) continue;
    dataRows.push({ rowNumber: i + 1, cells });
  }
  if (dataRows.length === 0) throw new Error('没有可导入的数据行');

  return { fileName: file.name, headers, dataRows };
}

const MAPPING_STORAGE_KEY = 'lms:knowledge-xlsx-column-mappings:v2';

type SavedHeaderMapping = Record<string, { target: ImportTargetField; extraLabel?: string }>;

function getHeaderSignature(headers: string[]): string {
  return headers.map((h) => h.trim()).join('\x1f');
}

function loadSavedMappings(): Record<string, SavedHeaderMapping> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MAPPING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedHeaderMapping>) : {};
  } catch {
    return {};
  }
}

/** 记住当前表头签名对应的字段映射，下次同类表格自动复用 */
export function saveColumnMappingPreference(headers: string[], mappings: ColumnMappingItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadSavedMappings();
    const signature = getHeaderSignature(headers);
    const entry: SavedHeaderMapping = {};
    for (const item of mappings) {
      entry[item.header] = { target: item.target, extraLabel: item.extraLabel };
    }
    all[signature] = entry;
    const keys = Object.keys(all);
    if (keys.length > 20) {
      keys.slice(0, keys.length - 20).forEach((k) => delete all[k]);
    }
    window.localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // 忽略隐私模式或配额错误
  }
}

/** 按上次记忆或常见表头别名自动预匹配映射 */
export function guessDefaultColumnMapping(sheet: ParsedXlsxSheet): ColumnMappingItem[] {
  const saved = loadSavedMappings()[getHeaderSignature(sheet.headers)];
  const usedSingletons = new Set<ImportTargetField>();

  return sheet.headers.map((header, colIndex) => {
    const firstSample = sheet.dataRows.find((r) => r.cells[colIndex])?.cells[colIndex] ?? '';
    const savedEntry = saved?.[header];
    if (savedEntry) {
      const target = savedEntry.target;
      if (!SINGLETON_IMPORT_FIELDS.has(target) || !usedSingletons.has(target)) {
        if (SINGLETON_IMPORT_FIELDS.has(target)) usedSingletons.add(target);
        return {
          colIndex,
          header,
          sample: firstSample,
          target,
          extraLabel: savedEntry.extraLabel || header,
        };
      }
    }

    const normalized = header.trim().toLowerCase();
    const aliasTarget = HEADER_ALIAS_MAP[normalized];
    let target: ImportTargetField = 'extra';

    if (aliasTarget) {
      if (SINGLETON_IMPORT_FIELDS.has(aliasTarget)) {
        if (!usedSingletons.has(aliasTarget)) {
          usedSingletons.add(aliasTarget);
          target = aliasTarget;
        }
      } else {
        target = aliasTarget;
      }
    }

    return {
      colIndex,
      header,
      sample: firstSample,
      target,
      extraLabel: header,
    };
  });
}

/** 按用户确认的映射组装批量导入请求体 */
export function resolveMappedImportRows(
  sheet: ParsedXlsxSheet,
  mappings: ColumnMappingItem[],
): { ready: KnowledgeBulkImportItem[]; failures: KnowledgeImportFailure[] } {
  const ready: KnowledgeBulkImportItem[] = [];
  const failures: KnowledgeImportFailure[] = [];

  for (const row of sheet.dataRows) {
    let rawId = '';
    let title = '';
    let section = '';
    let summary = '';
    let spaceName = '';
    let contentRaw = '';
    let url = '';
    let relatedLinksRaw = '';
    const tagItems: KnowledgeBulkImportTagItem[] = [];
    const seenTagNames = new Set<string>();
    const extraFields: KnowledgeExtraField[] = [];

    const pushTag = (name: string, category: string) => {
      const cleanName = name.trim();
      if (!cleanName || seenTagNames.has(cleanName)) return;
      seenTagNames.add(cleanName);
      tagItems.push({ name: cleanName, category: category.trim() });
    };

    for (const m of mappings) {
      if (m.target === 'ignore') continue;
      const val = (row.cells[m.colIndex] ?? '').trim();
      if (!val) continue;

      switch (m.target) {
        case 'id':
          rawId = val;
          break;
        case 'title':
          title = val;
          break;
        case 'summary':
          summary = summary ? `${summary}\n${val}` : val;
          break;
        case 'section':
          section = val;
          pushTag(val, m.header);
          break;
        case 'space':
          spaceName = val;
          break;
        case 'content':
          contentRaw = contentRaw ? `${contentRaw}\n${val}` : val;
          break;
        case 'url':
          url = val;
          break;
        case 'related_links':
          relatedLinksRaw = relatedLinksRaw ? `${relatedLinksRaw},${val}` : val;
          break;
        case 'tags': {
          const category = m.header === '标签' ? '' : m.header;
          for (const part of splitCsv(val)) {
            pushTag(part, category);
          }
          break;
        }
        case 'extra': {
          const label = (m.extraLabel || m.header).trim();
          if (label) extraFields.push({ label, value: val });
          break;
        }
      }
    }

    let parsedId: number | undefined;
    if (rawId) {
      const n = Number(rawId);
      if (!Number.isInteger(n) || n <= 0) {
        failures.push({ rowNumber: row.rowNumber, reason: `知识ID「${rawId}」无效，需为正整数或留空` });
        continue;
      }
      parsedId = n;
    }

    const content = normalizeImportContent(contentRaw);
    if (!title && !summary && !url && !content && extraFields.length === 0) {
      failures.push({ rowNumber: row.rowNumber, reason: '标题、针对故障、文档链接、步骤摘要、其余信息都为空' });
      continue;
    }

    ready.push({
      row_number: row.rowNumber,
      ...(parsedId !== undefined && { id: parsedId }),
      title,
      section,
      summary,
      content,
      extra_fields: extraFields,
      external_doc_url: url,
      space_name: spaceName,
      tag_names: tagItems.map((t) => t.name),
      tag_items: tagItems,
      related_links: parseRelatedLinksCell(relatedLinksRaw),
    });
  }

  return { ready, failures };
}

/** 快捷解析（用于按文档链接批量删除） */
export async function parseKnowledgeImportXlsx(file: File): Promise<KnowledgeImportRow[]> {
  const sheet = await readKnowledgeXlsxSheet(file);
  const mappings = guessDefaultColumnMapping(sheet);
  const { ready } = resolveMappedImportRows(sheet, mappings);
  return ready.map((item) => ({
    rowNumber: item.row_number,
    ...(item.id !== undefined && { id: item.id }),
    title: item.title,
    section: item.section ?? '',
    summary: item.summary ?? '',
    externalDocUrl: item.external_doc_url,
    spaceName: item.space_name,
    tagNames: item.tag_names,
    tagItems: item.tag_items ?? [],
    content: item.content,
    extraFields: item.extra_fields ?? [],
    relatedLinks: item.related_links,
  }));
}
