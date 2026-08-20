import React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export const QuestionChoiceIndicator: React.FC<{
  selected: boolean;
  shape?: 'circle' | 'square';
  className?: string;
  selectedClassName?: string;
  unselectedClassName?: string;
  iconClassName?: string;
  dotClassName?: string;
}> = ({
  selected,
  shape = 'circle',
  className,
  selectedClassName = 'border-primary-500 bg-primary-500',
  unselectedClassName = 'border-border bg-background',
  iconClassName,
  dotClassName,
}) => (
  <span
    className={cn(
      'inline-flex h-4 w-4 shrink-0 items-center justify-center border-2 transition-colors',
      shape === 'circle' ? 'rounded-full' : 'rounded-[4px]',
      selected ? selectedClassName : unselectedClassName,
      className,
    )}
    aria-hidden="true"
  >
    {shape === 'square' ? (
      <Check
        className={cn(
          'h-[10px] w-[10px] text-white',
          selected ? 'opacity-100' : 'opacity-0',
          iconClassName,
        )}
      />
    ) : (
      <span
        className={cn(
          'block h-[6px] w-[6px] rounded-full bg-white',
          selected ? 'opacity-100' : 'opacity-0',
          dotClassName,
        )}
      />
    )}
  </span>
);

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
        <QuestionChoiceIndicator
          selected={selected}
          shape={indicatorShape}
          className="ml-auto self-center"
        />
      </div>
    </Comp>
  );
};
