import * as XLSX from 'xlsx';
import type { KnowledgeWriteRequest } from '@/types/knowledge';

export type KnowledgeImportRow = {
  rowNumber: number;
  title: string;
  externalDocUrl: string;
  spaceName: string;
  tagNames: string[];
};

export type KnowledgeImportResolved = KnowledgeWriteRequest & {
  rowNumber: number;
};

export type KnowledgeImportFailure = {
  rowNumber: number;
  reason: string;
};

const HEADER_ALIASES: Record<string, 'title' | 'url' | 'space' | 'tags'> = {
  标题: 'title',
  title: 'title',
  文档链接: 'url',
  链接: 'url',
  url: 'url',
  link: 'url',
  external_doc_url: 'url',
  space: 'space',
  空间: 'space',
  标签: 'tags',
  tags: 'tags',
  tag: 'tags',
};

/**
 * 规范化表头：去空白、小写英文
 */
function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * 拆分标签列：支持逗号/中文逗号/分号
 */
function splitTagNames(raw: string): string[] {
  return raw
    .split(/[,，;；]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * 从 xlsx 第一张表解析知识导入行
 */
export async function parseKnowledgeImportXlsx(file: File): Promise<KnowledgeImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('表格为空');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (matrix.length < 2) {
    throw new Error('表格至少需要表头和一行数据');
  }

  const headerRow = matrix[0] ?? [];
  const columnMap = new Map<number, 'title' | 'url' | 'space' | 'tags'>();
  headerRow.forEach((cell, index) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)]
      ?? HEADER_ALIASES[String(cell ?? '').trim()];
    if (key) columnMap.set(index, key);
  });

  if (![...columnMap.values()].includes('url') && ![...columnMap.values()].includes('title')) {
    throw new Error('表头需包含「标题」或「文档链接」列');
  }

  const rows: KnowledgeImportRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? [];
    const mapped: Record<'title' | 'url' | 'space' | 'tags', string> = {
      title: '',
      url: '',
      space: '',
      tags: '',
    };
    columnMap.forEach((field, index) => {
      mapped[field] = String(cells[index] ?? '').trim();
    });

    if (!mapped.title && !mapped.url && !mapped.space && !mapped.tags) {
      continue;
    }

    rows.push({
      rowNumber: i + 1,
      title: mapped.title,
      externalDocUrl: mapped.url,
      spaceName: mapped.space,
      tagNames: splitTagNames(mapped.tags),
    });
  }

  if (rows.length === 0) {
    throw new Error('没有可导入的数据行');
  }

  return rows;
}

type TagLike = { id: number; name: string };

/**
 * 收集导入行里需要用到的 space / 标签名
 */
export function collectKnowledgeImportNames(rows: KnowledgeImportRow[]): {
  spaceNames: string[];
  tagNames: string[];
} {
  const spaces = new Set<string>();
  const tags = new Set<string>();
  for (const row of rows) {
    if (row.spaceName) spaces.add(row.spaceName);
    for (const name of row.tagNames) tags.add(name);
  }
  return {
    spaceNames: [...spaces],
    tagNames: [...tags],
  };
}

/**
 * 将导入行解析为创建请求（调用方需先保证 space/标签名已存在）
 */
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
    if (!row.title && !row.externalDocUrl) {
      failures.push({ rowNumber: row.rowNumber, reason: '标题和文档链接都为空' });
      continue;
    }

    let spaceTagId: number | undefined;
    if (row.spaceName) {
      const matched = spaceByName.get(row.spaceName);
      if (!matched) {
        failures.push({ rowNumber: row.rowNumber, reason: `space「${row.spaceName}」创建失败` });
        continue;
      }
      spaceTagId = matched;
    }

    const tagIds: number[] = [];
    let tagMiss: string | null = null;
    for (const name of row.tagNames) {
      const matched = tagByName.get(name);
      if (!matched) {
        tagMiss = name;
        break;
      }
      tagIds.push(matched);
    }
    if (tagMiss) {
      failures.push({ rowNumber: row.rowNumber, reason: `标签「${tagMiss}」创建失败` });
      continue;
    }

    ready.push({
      rowNumber: row.rowNumber,
      ...(row.title && { title: row.title }),
      ...(row.externalDocUrl && { external_doc_url: row.externalDocUrl }),
      ...(spaceTagId !== undefined && { space_tag_id: spaceTagId }),
      ...(tagIds.length > 0 && { tag_ids: tagIds }),
      content: '',
    });
  }

  return { ready, failures };
}
