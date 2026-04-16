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
    min-width: 264px;
    border-radius: 12px;
    border: 1px solid rgba(214, 223, 235, 0.92);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 18px 44px rgba(148, 163, 184, 0.22), 0 4px 14px rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(14px);
    padding: 12px 14px;
  }

  .sqe-toolbar-link-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }

  .sqe-toolbar-link-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .sqe-toolbar-link-input {
    flex: 1;
    min-width: 0;
    height: 38px;
    border: none;
    border-bottom: 1px solid rgba(95, 109, 132, 0.18);
    border-radius: 0;
    padding: 8px 2px 6px;
    background: transparent;
    color: #48576a;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s ease, color 0.15s ease;
  }

  .sqe-toolbar-link-input::placeholder {
    color: #9aa5b3;
  }

  .sqe-toolbar-link-input:focus {
    border-bottom-color: rgba(86, 109, 145, 0.42);
    color: #334155;
  }

  .sqe-toolbar-link-action {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 999px;
    padding: 0;
    background: transparent;
    color: #7a8698;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .sqe-toolbar-link-action:hover {
    background: rgba(255,255,255,0.32);
    color: #526277;
  }

  .sqe-toolbar-link-action-confirm {
    color: #64748b;
  }

  .sqe-toolbar-link-action-confirm:hover {
    color: #334155;
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
      <style>{FLOATING_FORMAT_TOOLBAR_STYLES}</style>
    </>
  );
}
