import { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Italic,
  Link2,
  List,
  ListOrdered,
  PaintBucket,
  Quote,
  Strikethrough,
  Underline,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type BlockStyle = 'p' | 'h1' | 'h2' | 'h3' | 'h4';
export type TextAlign = 'left' | 'center' | 'right';

export interface ToolbarFormatState {
  background: string | null;
  block: BlockStyle;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: string | null;
  align: TextAlign;
  orderedList: boolean;
  unorderedList: boolean;
  blockquote: boolean;
  code: boolean;
}

interface FloatingFormatToolbarProps {
  activeFormats: ToolbarFormatState;
  onApplyBackground: (value: string | null) => void;
  onApplyLink: (value: string | null) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrike: () => void;
  onApplyBlock: (block: BlockStyle) => void;
  onApplyAlign: (align: TextAlign) => void;
  onToggleOrderedList: () => void;
  onToggleUnorderedList: () => void;
  onToggleBlockquote: () => void;
  onToggleCode: () => void;
}

const BACKGROUND_COLORS = [
  { label: '柠黄', value: '#fef08a' },
  { label: '薄荷', value: '#bbf7d0' },
  { label: '天青', value: '#bfdbfe' },
  { label: '珊瑚', value: '#fecaca' },
  { label: '薰灰', value: '#e9d5ff' },
] as const;

const BLOCK_OPTIONS: { value: BlockStyle; label: string; short: string }[] = [
  { value: 'h1', label: '一级标题', short: 'H1' },
  { value: 'h2', label: '二级标题', short: 'H2' },
  { value: 'h3', label: '三级标题', short: 'H3' },
  { value: 'h4', label: '四级标题', short: 'H4' },
  { value: 'p', label: '正文', short: '正文' },
];

function normalizeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function FloatingFormatToolbar({
  activeFormats,
  onApplyBackground,
  onApplyLink,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrike,
  onApplyBlock,
  onApplyAlign,
  onToggleOrderedList,
  onToggleUnorderedList,
  onToggleBlockquote,
  onToggleCode,
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

  const closePanel = () => setOpenPanel(null);

  return (
    <div className="sqe-toolbar sqe-toolbar-top">
      <div className="sqe-toolbar-group">
        {BLOCK_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            className={cn(
              'sqe-toolbar-block-btn',
              `sqe-toolbar-block-btn-${option.value}`,
              option.value === activeFormats.block && 'sqe-toolbar-btn-active',
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onApplyBlock(option.value)}
          >
            {option.short}
          </button>
        ))}
      </div>

      <span className="sqe-toolbar-divider" />

      <div className="sqe-toolbar-group">
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.bold && 'sqe-toolbar-btn-active')}
          aria-label="粗体"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleBold}
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.italic && 'sqe-toolbar-btn-active')}
          aria-label="斜体"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleItalic}
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.underline && 'sqe-toolbar-btn-active')}
          aria-label="下划线"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleUnderline}
        >
          <Underline size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.strike && 'sqe-toolbar-btn-active')}
          aria-label="删除线"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleStrike}
        >
          <Strikethrough size={15} />
        </button>
      </div>

      <span className="sqe-toolbar-divider" />

      <div className="sqe-toolbar-group">
        <button
          type="button"
          className={cn(
            'sqe-toolbar-btn',
            (hasActiveBackground || openPanel === 'background') && 'sqe-toolbar-btn-active',
          )}
          aria-label="高亮"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenPanel((current) => (current === 'background' ? null : 'background'))}
        >
          <PaintBucket size={15} />
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
          <Link2 size={15} />
        </button>
      </div>

      <span className="sqe-toolbar-divider" />

      <div className="sqe-toolbar-group">
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.align === 'left' && 'sqe-toolbar-btn-active')}
          aria-label="左对齐"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApplyAlign('left')}
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.align === 'center' && 'sqe-toolbar-btn-active')}
          aria-label="居中"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApplyAlign('center')}
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.align === 'right' && 'sqe-toolbar-btn-active')}
          aria-label="右对齐"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApplyAlign('right')}
        >
          <AlignRight size={15} />
        </button>
      </div>

      <span className="sqe-toolbar-divider" />

      <div className="sqe-toolbar-group">
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.unorderedList && 'sqe-toolbar-btn-active')}
          aria-label="无序列表"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleUnorderedList}
        >
          <List size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.orderedList && 'sqe-toolbar-btn-active')}
          aria-label="有序列表"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleOrderedList}
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.blockquote && 'sqe-toolbar-btn-active')}
          aria-label="引用"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleBlockquote}
        >
          <Quote size={15} />
        </button>
        <button
          type="button"
          className={cn('sqe-toolbar-btn', activeFormats.code && 'sqe-toolbar-btn-active')}
          aria-label="行内代码"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleCode}
        >
          <Code2 size={15} />
        </button>
      </div>

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
                  closePanel();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closePanel();
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
                    closePanel();
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
                    closePanel();
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
                  closePanel();
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
                closePanel();
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
