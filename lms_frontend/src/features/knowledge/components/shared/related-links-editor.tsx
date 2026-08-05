import * as React from 'react';
import { X } from 'lucide-react';

import type { RelatedLink } from '@/types/knowledge';

interface RelatedLinksEditorProps {
  links: RelatedLink[];
  onChange: (index: number, field: keyof RelatedLink, value: string) => void;
  onRemove: (index: number) => void;
  onSubmit?: () => void;
  titlePlaceholder?: string;
  urlPlaceholder?: string;
}

/**
 * 相关链接行内编辑：与文档链接共用 krl-input 下划线样式
 */
export const RelatedLinksEditor: React.FC<RelatedLinksEditorProps> = ({
  links,
  onChange,
  onRemove,
  onSubmit,
  titlePlaceholder = '',
  urlPlaceholder = 'https://...',
}) => {
  if (links.length === 0) return null;

  return (
    <div className="krl-list">
      <div className="krl-column-head">
        <span className="krl-column-label">名称</span>
        <span className="krl-column-label">链接</span>
        <span />
      </div>

      {links.map((link, index) => (
        <div key={`detail-related-link-${index}`} className="krl-row">
          <input
            value={link.title ?? ''}
            onChange={(event) => onChange(index, 'title', event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && onSubmit) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={titlePlaceholder}
            aria-label="链接标题"
            className="krl-input krl-input-title"
          />
          <input
            value={link.url}
            onChange={(event) => onChange(index, 'url', event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && onSubmit) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={urlPlaceholder}
            aria-label="链接地址"
            className="krl-input"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="kg-ghost-icon-btn krl-remove-btn"
            aria-label="删除相关链接"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
