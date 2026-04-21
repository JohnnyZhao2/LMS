import { useMemo, useState } from 'react';
import {
  Bold,
  Check,
  Link2,
  PaintBucket,
  Heading2,
  Heading3,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface FloatingFormatToolbarProps {
  activeFormats: {
    background: string | null;
    bold: boolean;
    checklist: boolean;
    link: string | null;
    header: number | false;
  };
  position: {
    left: number;
    top: number;
  };
  onApplyBackground: (value: string | null) => void;
  onApplyLink: (value: string | null) => void;
  onToggleBold: () => void;
  onApplyHeader: (level: number | false) => void;
}

const BACKGROUND_COLORS = [
  { label: '柠黄', value: '#fef08a' },
  { label: '薄荷', value: '#bbf7d0' },
  { label: '天青', value: '#bfdbfe' },
  { label: '珊瑚', value: '#fecaca' },
  { label: '薰灰', value: '#e9d5ff' },
] as const;

function normalizeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function FloatingFormatToolbar({
  activeFormats,
  position,
  onApplyBackground,
  onApplyLink,
  onToggleBold,
  onApplyHeader,
}: FloatingFormatToolbarProps) {
  const [openPanel, setOpenPanel] = useState<'background' | 'link' | null>(null);
  const [linkValue, setLinkValue] = useState('');

  const normalizedBackground = activeFormats.background?.toLowerCase() ?? null;
  const hasActiveBackground = useMemo(() => (
    BACKGROUND_COLORS.some((item) => item.value.toLowerCase() === normalizedBackground)
  ), [normalizedBackground]);
  const normalizedLinkValue = normalizeLink(linkValue);
  const currentLink = activeFormats.link ?? '';
  const shouldShowApplyAction = normalizedLinkValue.length > 0 && normalizedLinkValue !== currentLink;

  return (
    <>
      <div
        className="sqe-toolbar"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.header === 2 && 'sqe-toolbar-btn-active')}
          aria-label="二级标题"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApplyHeader(activeFormats.header === 2 ? false : 2)}
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.header === 3 && 'sqe-toolbar-btn-active')}
          aria-label="三级标题"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApplyHeader(activeFormats.header === 3 ? false : 3)}
        >
          <Heading3 size={16} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.bold && 'sqe-toolbar-btn-active')}
          aria-label="粗体"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleBold}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', Boolean(activeFormats.link) && 'sqe-toolbar-btn-active')}
          aria-label="链接"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenPanel((current) => {
            const nextPanel = current === 'link' ? null : 'link';
            if (nextPanel === 'link') {
              setLinkValue(activeFormats.link ?? '');
            }
            return nextPanel;
          })}
        >
          <Link2 size={16} />
        </button>
        <button
          type="button"
          className={cn(
            'sqe-toolbar-btn',
            (hasActiveBackground || openPanel === 'background') && 'sqe-toolbar-btn-active',
          )}
          aria-label="高亮"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenPanel((current) => current === 'background' ? null : 'background')}
        >
          <PaintBucket size={16} />
        </button>

        {openPanel === 'link' && (
          <div className="sqe-toolbar-popover">
            <div className="sqe-toolbar-link-row">
              <input
                autoFocus
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onApplyLink(linkValue ? normalizeLink(linkValue) : null);
                    setOpenPanel(null);
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setOpenPanel(null);
                  }
                }}
                placeholder="粘贴或输入链接"
                className="sqe-toolbar-link-input"
              />
              <div className="sqe-toolbar-link-actions">
                {shouldShowApplyAction ? (
                  <button
                    type="button"
                    className="sqe-toolbar-link-action sqe-toolbar-link-action-confirm"
                    aria-label="应用链接"
                    onClick={() => {
                      onApplyLink(normalizedLinkValue);
                      setOpenPanel(null);
                    }}
                  >
                    <Check size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sqe-toolbar-link-action"
                    aria-label={activeFormats.link ? '清除链接' : '关闭'}
                    onClick={() => {
                      if (activeFormats.link) {
                        onApplyLink(null);
                      }
                      setOpenPanel(null);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {openPanel === 'background' && (
          <div className="sqe-toolbar-popover">
            <div className="sqe-toolbar-color-grid">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color.label}
                  title={color.label}
                  className={cn(
                    'sqe-toolbar-color-swatch',
                    color.value.toLowerCase() === normalizedBackground && 'sqe-toolbar-color-swatch-active',
                  )}
                  style={{ background: color.value }}
                  onClick={() => {
                    onApplyBackground(color.value);
                    setOpenPanel(null);
                  }}
                />
              ))}
              <button
                type="button"
                aria-label="清除背景色"
                title="清除背景色"
                className={cn(
                  'sqe-toolbar-color-swatch sqe-toolbar-color-clear',
                  !normalizedBackground && 'sqe-toolbar-color-swatch-active',
                )}
                onClick={() => {
                  onApplyBackground(null);
                  setOpenPanel(null);
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
