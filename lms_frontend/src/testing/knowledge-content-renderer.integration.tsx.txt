import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KnowledgeContentRenderer } from '@/features/knowledge/components/shared/knowledge-content-renderer';

describe('KnowledgeContentRenderer', () => {
  it('removes executable markup before rendering knowledge HTML', () => {
    const { container } = render(
      <KnowledgeContentRenderer
        html={'<p>安全内容</p><img src="x" onerror="alert(1)"><script>alert(2)</script>'}
      />,
    );

    expect(container).toHaveTextContent('安全内容');
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toHaveAttribute('onerror');
  });
});
