import * as React from 'react';
import { Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { RelatedLink } from '@/types/knowledge';

import './knowledge-editor-shared.css';

interface RelatedLinksEditorProps {
  variant: 'detail' | 'focus';
  links: RelatedLink[];
  onChange: (index: number, field: keyof RelatedLink, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSubmit?: () => void;
  title?: string;
  subtitle?: string;
  emptyLabel?: string;
  showColumnLabels?: boolean;
  titlePlaceholder?: string;
  urlPlaceholder?: string;
  className?: string;
}

export const RelatedLinksEditor: React.FC<RelatedLinksEditorProps> = ({
  variant,
  links,
  onChange,
  onAdd,
  onRemove,
  onSubmit,
  title,
  subtitle,
  emptyLabel = '添加相关链接',
  showColumnLabels = false,
  titlePlaceholder = '',
  urlPlaceholder = '',
  className,
}) => {
  const hasHeader = Boolean(title || subtitle);

  return (
    <div className={cn('krl-editor', `krl-editor-${variant}`, className)}>
      {hasHeader ? (
        <div className="krl-panel-header">
          <div>
            {title ? <p className="krl-panel-title">{title}</p> : null}
            {subtitle ? <p className="krl-panel-subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="kg-ghost-icon-btn krl-add-btn"
            aria-label="添加相关链接"
          >
            <Plus size={12} />
          </button>
        </div>
      ) : null}

      {links.length > 0 ? (
        <div className="krl-list">
          {showColumnLabels ? (
            <div className="krl-column-head">
              <span className="krl-column-label">名称</span>
              <span className="krl-column-label">链接</span>
              <span />
            </div>
          ) : null}

          {links.map((link, index) => (
            <div key={`${variant}-related-link-${index}`} className="krl-row">
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
      ) : (
        <button type="button" onClick={onAdd} className="krl-empty">
          {emptyLabel}
        </button>
      )}
    </div>
  );
};
