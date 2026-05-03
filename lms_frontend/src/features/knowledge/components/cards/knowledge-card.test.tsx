import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { KnowledgeListItem } from '@/types/knowledge';
import { KnowledgeCardMymind } from './knowledge-card';

const knowledgeItem: KnowledgeListItem = {
  id: 1,
  title: '列表知识',
  content: '<ol><li>第一项</li><li>第二项</li></ol>',
  view_count: 0,
  created_at: '2026-05-03T00:00:00.000Z',
  updated_at: '2026-05-03T00:00:00.000Z',
};

describe('KnowledgeCardMymind', () => {
  it('卡片正文复用知识富文本渲染器', () => {
    const { container } = render(
      <KnowledgeCardMymind
        item={knowledgeItem}
        index={0}
        onClick={vi.fn()}
      />,
    );

    const content = screen.getByText('第一项').closest('.sqe-content');
    expect(content).not.toBeNull();
    expect(content?.closest('.ke-content-card-preview')).not.toBeNull();
    expect(container.querySelector('.card-rich')).toBeNull();
  });
});
