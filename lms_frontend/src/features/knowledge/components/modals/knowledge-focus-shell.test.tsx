import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KnowledgeFocusShell } from './knowledge-focus-shell';

vi.mock('../editor/rich-text-editor', () => ({
  SlashQuillEditor: ({ className }: { className?: string }) => (
    <div data-testid="focus-editor" className={className} />
  ),
}));

describe('KnowledgeFocusShell', () => {
  it('复用详情页富文本样式并叠加全屏样式', () => {
    render(
      <KnowledgeFocusShell
        content="<h2>标题</h2><ol><li>条目</li></ol>"
        onContentChange={vi.fn()}
        onExit={vi.fn()}
        fixed={false}
      />,
    );

    expect(screen.getByTestId('focus-editor')).toHaveClass('ke-content-detail', 'ke-content-focus');
  });
});
