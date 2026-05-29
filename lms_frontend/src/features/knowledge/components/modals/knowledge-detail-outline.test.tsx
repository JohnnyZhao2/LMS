import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KnowledgeDetailOutline } from './knowledge-detail-outline';
import { getKnowledgeOutlineItems } from './knowledge-detail-outline-utils';

describe('KnowledgeDetailOutline', () => {
  it('只渲染目录标题，不添加额外前缀标记', () => {
    const items = getKnowledgeOutlineItems('<h2>2.1 团队结构</h2>');

    render(
      <KnowledgeDetailOutline
        items={items}
        activeId={items[0].id}
        onSelect={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: '2.1 团队结构' });

    expect(button.querySelector('.kd-outline-marker')).toBeNull();
    expect(screen.getByText('2.1 团队结构')).toHaveClass('kd-outline-title');
  });
});
