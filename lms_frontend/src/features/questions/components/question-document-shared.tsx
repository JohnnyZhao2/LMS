import React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface QuestionDocumentDividerProps {
  isCompact: boolean;
  dividerPositionStyle?: React.CSSProperties;
  resizable?: boolean;
  onResizeStart?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export const QuestionDocumentDivider: React.FC<QuestionDocumentDividerProps> = ({
  isCompact,
  dividerPositionStyle,
  resizable = false,
  onResizeStart,
}) => {
  if (isCompact) {
    return null;
  }

  return (
    <div
      className="absolute inset-y-0 z-10 w-[42px] -translate-x-1/2"
      style={dividerPositionStyle}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border"
        aria-hidden="true"
      />
      {resizable ? (
        <button
          type="button"
          aria-label="调整题干与选项区域宽度"
          onPointerDown={onResizeStart}
          className="group absolute inset-y-0 left-1/2 flex w-[42px] -translate-x-1/2 cursor-col-resize select-none items-center justify-center"
        >
          <span className="pointer-events-none relative inline-flex h-6 w-4 items-center justify-center rounded-[10px] border border-border/85 bg-background text-text-muted shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-colors group-hover:border-foreground/12 group-hover:text-foreground/70">
            <span className="grid grid-cols-2 gap-[1.5px]">
              {Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={index}
                  className="h-[1.5px] w-[1.5px] rounded-full bg-current"
                />
              ))}
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
};

export const QuestionChoiceRow: React.FC<{
  optionKey: string;
  label: React.ReactNode;
  selected: boolean;
  indicatorShape?: 'circle' | 'square';
  interactive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}> = ({
  optionKey,
  label,
  selected,
  indicatorShape = 'circle',
  interactive = false,
  disabled = false,
  onClick,
}) => {
  const Comp = interactive ? 'button' : 'div';

  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={interactive && !disabled ? onClick : undefined}
      className={cn(
        'w-full text-left transition-colors',
        interactive && !disabled && 'cursor-pointer',
        disabled && 'cursor-default opacity-75',
      )}
    >
      <div
        className={cn(
          'flex min-h-[42px] w-full items-start gap-3 rounded-xl border px-4 py-2.5 transition-colors',
          selected
            ? 'border-primary-300 bg-primary-50/70'
            : 'border-border bg-background',
          interactive && !disabled && 'hover:border-primary-200 hover:bg-primary-50/35',
        )}
      >
        <div className="flex min-h-[18px] w-0 min-w-0 flex-1 items-start whitespace-pre-wrap break-all text-[14px] leading-[1.45] text-foreground">
          {label || optionKey || '未填写选项内容'}
        </div>
        <span
          className={cn(
            'mt-0.5 ml-auto inline-flex h-4 w-4 shrink-0 items-center justify-center self-start border-2 transition-colors',
            indicatorShape === 'circle' ? 'rounded-full' : 'rounded-[4px]',
            selected
              ? 'border-primary-500 bg-primary-500'
              : 'border-border bg-background',
          )}
          aria-hidden="true"
        >
          {indicatorShape === 'square' ? (
            <Check
              className={cn(
                'h-[10px] w-[10px] text-white transition-all',
                selected ? 'opacity-100' : 'opacity-0',
              )}
            />
          ) : (
            <span
              className={cn(
                'block rounded-full bg-white transition-all',
                selected ? 'h-[6px] w-[6px]' : 'h-0 w-0',
              )}
            />
          )}
        </span>
      </div>
    </Comp>
  );
};
