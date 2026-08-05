import { describe, expect, it } from 'vitest';
import {
  normalizeImportContent,
  parseRelatedLinksCell,
  resolveKnowledgeImportRows,
  type KnowledgeImportRow,
} from './import-knowledge-xlsx';

function row(partial: Partial<KnowledgeImportRow> & { rowNumber: number }): KnowledgeImportRow {
  return {
    title: '',
    externalDocUrl: '',
    spaceName: '',
    tagNames: [],
    content: '',
    relatedLinks: [],
    ...partial,
  };
}

describe('import-knowledge-xlsx', () => {
  it('normalizeImportContent 把换行转成 br', () => {
    expect(normalizeImportContent('第一步\n第二步')).toBe('第一步<br>第二步');
  });

  it('parseRelatedLinksCell 按逗号解析 url 或 名称|url', () => {
    expect(parseRelatedLinksCell('手册|https://a.com,https://b.com，说明|https://c.com')).toEqual([
      { title: '手册', url: 'https://a.com' },
      { title: '', url: 'https://b.com' },
      { title: '说明', url: 'https://c.com' },
    ]);
  });

  it('resolveKnowledgeImportRows 写入全部业务字段', () => {
    const { ready, failures } = resolveKnowledgeImportRows(
      [
        row({
          rowNumber: 2,
          title: '开机',
          content: '插电<br>开机',
          externalDocUrl: 'https://xx.feishu.cn/wiki/v?id=abc',
          relatedLinks: [{ title: '手册', url: 'https://docs.example.com' }],
          spaceName: '运维',
          tagNames: ['SOP'],
        }),
      ],
      [{ id: 1, name: '运维' }],
      [{ id: 9, name: 'SOP' }],
    );

    expect(failures).toEqual([]);
    expect(ready).toEqual([
      {
        rowNumber: 2,
        title: '开机',
        content: '插电<br>开机',
        external_doc_url: 'https://xx.feishu.cn/wiki/v?id=abc',
        related_links: [{ title: '手册', url: 'https://docs.example.com' }],
        space_tag_id: 1,
        tag_ids: [9],
      },
    ]);
  });
});
