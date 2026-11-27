import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { RelatedLink } from '@/types/knowledge';

export const GHOST_ICON_BTN_CLASS =
  'inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#a0a8b0] transition-[color,background-color] duration-150 ease-in-out hover:bg-white/[0.32] hover:text-[#526277]';

export const UNDERLINE_INPUT_CLASS =
  'w-full min-w-0 rounded-none border-0 border-b border-[rgba(95,109,132,0.18)] bg-transparent px-[2px] pt-2 pb-[6px] font-inherit text-[12px] text-[#48576a] outline-none transition-[border-color,color] duration-150 ease-in-out placeholder:text-[#9aa5b3] focus:border-[rgba(86,109,145,0.42)] focus:text-[#334155]';

const GRID_ROW_CLASS =
  'grid grid-cols-[minmax(0,108px)_minmax(0,1fr)_28px] gap-[10px] max-[860px]:grid-cols-[minmax(0,92px)_minmax(0,1fr)_28px] max-[860px]:gap-2';

interface RelatedLinksEditorProps {
  links: RelatedLink[];
  onChange: (index: number, field: keyof RelatedLink, value: string) => void;
  onRemove: (index: number) => void;
  onSubmit?: () => void;
  titlePlaceholder?: string;
  urlPlaceholder?: string;
}

/**
 * 相关链接行内编辑：与文档链接共用下划线输入框样式
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
    <div className="flex flex-col gap-2">
      <div className={cn(GRID_ROW_CLASS, 'items-end')}>
        <span className="text-[10px] leading-none tracking-[0.08em] text-[#99a3af] uppercase">名称</span>
        <span className="text-[10px] leading-none tracking-[0.08em] text-[#99a3af] uppercase">链接</span>
        <span />
      </div>

      {links.map((link, index) => (
        <div key={`detail-related-link-${index}`} className={cn(GRID_ROW_CLASS, 'items-center')}>
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
            className={cn(UNDERLINE_INPUT_CLASS, 'max-w-[108px] max-[860px]:max-w-[92px]')}
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
            className={UNDERLINE_INPUT_CLASS}
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={cn(GHOST_ICON_BTN_CLASS, 'h-7 w-7')}
            aria-label="删除相关链接"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
