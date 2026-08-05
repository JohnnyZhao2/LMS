import * as XLSX from 'xlsx';
import type { KnowledgeWriteRequest, RelatedLink } from '@/types/knowledge';
import { sanitizeStepsHtml } from './content-utils';
import { sanitizeRelatedLinks } from './related-links';

/** 导入表头（必须完全一致） */
export const KNOWLEDGE_IMPORT_HEADERS = [
  '标题',
  '文档链接',
  'space',
  '标签',
  '简洁执行步骤',
  '相关链接',
] as const;

export type KnowledgeImportRow = {
  rowNumber: number;
  title: string;
  externalDocUrl: string;
  spaceName: string;
  tagNames: string[];
  content: string;
  relatedLinks: RelatedLink[];
};

export type KnowledgeImportResolved = KnowledgeWriteRequest & { rowNumber: number };
export type KnowledgeImportFailure = { rowNumber: number; reason: string };

type ImportField = 'title' | 'url' | 'space' | 'tags' | 'content' | 'related_links';

const HEADER_TO_FIELD: Record<string, ImportField> = {
  标题: 'title',
  文档链接: 'url',
  space: 'space',
  标签: 'tags',
  简洁执行步骤: 'content',
  相关链接: 'related_links',
};

const HEADER_HINT = `表头必须为：${KNOWLEDGE_IMPORT_HEADERS.join('、')}`;
const splitCsv = (raw: string) => raw.split(/[,，]/).map((p) => p.trim()).filter(Boolean);

/** 表格纯文本步骤 → 存库 HTML */
export function normalizeImportContent(raw: string): string {
  return sanitizeStepsHtml(raw.replace(/\r\n|\r|\n/g, '<br>'));
}

/** 相关链接：逗号分隔，单项 url 或 名称|url */
export function parseRelatedLinksCell(raw: string): RelatedLink[] {
  return sanitizeRelatedLinks(
    splitCsv(raw).map((part) => {
      const pipe = part.indexOf('|');
      return pipe >= 0
        ? { title: part.slice(0, pipe).trim(), url: part.slice(pipe + 1).trim() }
        : { title: '', url: part };
    }),
  );
}

/** 解析 xlsx 第一张表 */
export async function parseKnowledgeImportXlsx(file: File): Promise<KnowledgeImportRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('表格为空');

  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(
    workbook.Sheets[sheetName],
    { header: 1, defval: '', raw: false },
  );
  if (matrix.length < 2) throw new Error('表格至少需要表头和一行数据');

  const columnMap = new Map<number, ImportField>();
  for (const [index, cell] of (matrix[0] ?? []).entries()) {
    const header = String(cell ?? '').trim();
    if (!header) continue;
    const field = HEADER_TO_FIELD[header];
    if (!field) throw new Error(`未知表头「${header}」。${HEADER_HINT}`);
    columnMap.set(index, field);
  }
  if (columnMap.size === 0) throw new Error(HEADER_HINT);

  const rows: KnowledgeImportRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? [];
    const mapped: Record<ImportField, string> = {
      title: '', url: '', space: '', tags: '', content: '', related_links: '',
    };
    columnMap.forEach((field, index) => {
      mapped[field] = String(cells[index] ?? '').trim();
    });
    if (!Object.values(mapped).some(Boolean)) continue;

    rows.push({
      rowNumber: i + 1,
      title: mapped.title,
      externalDocUrl: mapped.url,
      spaceName: mapped.space,
      tagNames: splitCsv(mapped.tags),
      content: normalizeImportContent(mapped.content),
      relatedLinks: parseRelatedLinksCell(mapped.related_links),
    });
  }
  if (rows.length === 0) throw new Error('没有可导入的数据行');
  return rows;
}

type TagLike = { id: number; name: string };

/** 收集导入所需 space / 标签名 */
export function collectKnowledgeImportNames(rows: KnowledgeImportRow[]) {
  const spaces = new Set<string>();
  const tags = new Set<string>();
  for (const row of rows) {
    if (row.spaceName) spaces.add(row.spaceName);
    for (const name of row.tagNames) tags.add(name);
  }
  return { spaceNames: [...spaces], tagNames: [...tags] };
}

/** 解析为写入请求（调用方需先保证 space/标签已存在） */
export function resolveKnowledgeImportRows(
  rows: KnowledgeImportRow[],
  spaces: TagLike[],
  tags: TagLike[],
): { ready: KnowledgeImportResolved[]; failures: KnowledgeImportFailure[] } {
  const spaceByName = new Map(spaces.map((item) => [item.name.trim(), item.id]));
  const tagByName = new Map(tags.map((item) => [item.name.trim(), item.id]));
  const ready: KnowledgeImportResolved[] = [];
  const failures: KnowledgeImportFailure[] = [];

  for (const row of rows) {
    if (!row.title && !row.externalDocUrl && !row.content) {
      failures.push({ rowNumber: row.rowNumber, reason: '标题、文档链接、简洁执行步骤都为空' });
      continue;
    }

    let spaceTagId: number | null = null;
    if (row.spaceName) {
      const matched = spaceByName.get(row.spaceName);
      if (!matched) {
        failures.push({ rowNumber: row.rowNumber, reason: `space「${row.spaceName}」创建失败` });
        continue;
      }
      spaceTagId = matched;
    }

    const tagIds: number[] = [];
    const tagMiss = row.tagNames.find((name) => !tagByName.has(name));
    if (tagMiss) {
      failures.push({ rowNumber: row.rowNumber, reason: `标签「${tagMiss}」创建失败` });
      continue;
    }
    for (const name of row.tagNames) tagIds.push(tagByName.get(name)!);

    ready.push({
      rowNumber: row.rowNumber,
      title: row.title,
      content: row.content,
      external_doc_url: row.externalDocUrl,
      space_tag_id: spaceTagId,
      tag_ids: tagIds,
      related_links: row.relatedLinks,
    });
  }

  return { ready, failures };
}
