import { useEffect, useMemo, useState } from 'react';
import {
  Bold,
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
  visible: boolean;
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

const FLOATING_FORMAT_TOOLBAR_STYLES = `
  .sqe-toolbar {
    position: absolute;
    z-index: 70;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 7px;
    border: 1px solid rgba(220, 226, 236, 0.92);
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.05);
    transform: translateX(-50%);
  }

  .sqe-toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: background-color 0.14s ease, color 0.14s ease;
  }

  .sqe-toolbar-btn:hover,
  .sqe-toolbar-btn:focus-visible,
  .sqe-toolbar-btn-active {
    background: #eef2f7;
    color: #0f172a;
    outline: none;
  }

  .sqe-toolbar-popover {
    position: absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 220px;
    border-radius: 16px;
    border: 1px solid rgba(220, 226, 236, 0.92);
    background: rgba(255, 255, 255, 0.99);
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.06);
    padding: 10px;
  }

  .sqe-toolbar-link-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sqe-toolbar-link-input {
    flex: 1;
    height: 36px;
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 10px;
    padding: 0 12px;
    background: #ffffff;
    color: #0f172a;
    font-size: 13px;
    outline: none;
  }

  .sqe-toolbar-link-input:focus {
    border-color: rgba(148, 163, 184, 0.95);
  }

  .sqe-toolbar-link-action {
    height: 36px;
    border: none;
    border-radius: 10px;
    padding: 0 12px;
    background: #0f172a;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .sqe-toolbar-link-clear {
    background: #f1f5f9;
    color: #475569;
  }

  .sqe-toolbar-color-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
  }

  .sqe-toolbar-color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 9999px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.14s ease, border-color 0.14s ease;
  }

  .sqe-toolbar-color-swatch:hover,
  .sqe-toolbar-color-swatch-active {
    transform: scale(1.07);
    border-color: rgba(15, 23, 42, 0.24);
  }

  .sqe-toolbar-color-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    color: #64748b;
  }
`;

function normalizeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function FloatingFormatToolbar({
  activeFormats,
  position,
  visible,
  onApplyBackground,
  onApplyLink,
  onToggleBold,
  onApplyHeader,
}: FloatingFormatToolbarProps) {
  const [openPanel, setOpenPanel] = useState<'background' | 'link' | null>(null);
  const [linkValue, setLinkValue] = useState('');

  useEffect(() => {
    if (!visible) {
      setOpenPanel(null);
    }
  }, [visible]);

  useEffect(() => {
    if (openPanel === 'link') {
      setLinkValue(activeFormats.link ?? '');
    }
  }, [activeFormats.link, openPanel]);

  const normalizedBackground = activeFormats.background?.toLowerCase() ?? null;
  const hasActiveBackground = useMemo(() => (
    BACKGROUND_COLORS.some((item) => item.value.toLowerCase() === normalizedBackground)
  ), [normalizedBackground]);

  if (!visible) return null;

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
          onClick={() => setOpenPanel((current) => current === 'link' ? null : 'link')}
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
              <button
                type="button"
                className="sqe-toolbar-link-action"
                onClick={() => {
                  onApplyLink(linkValue ? normalizeLink(linkValue) : null);
                  setOpenPanel(null);
                }}
              >
                应用
              </button>
            </div>
            {activeFormats.link && (
              <div className="mt-2">
                <button
                  type="button"
                  className="sqe-toolbar-link-action sqe-toolbar-link-clear"
                  onClick={() => {
                    onApplyLink(null);
                    setOpenPanel(null);
                  }}
                >
                  清除链接
                </button>
              </div>
            )}
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
      <style>{FLOATING_FORMAT_TOOLBAR_STYLES}</style>
    </>
  );
}
