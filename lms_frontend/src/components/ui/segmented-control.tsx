/**
 * 分段式控制器组件 - 用于筛选和选项切换
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentedOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string | null;
  onChange: (value: string) => void;
  onClear?: () => void;
  label?: string;
  className?: string;
  size?: 'default' | 'sm';
  fill?: boolean;
  allowDeselect?: boolean;
  showClearOnSelected?: boolean;
  activeOptionClassName?: string;
  inactiveOptionClassName?: string;
  disabledOptionClassName?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  onClear,
  label,
  className,
  size = 'default',
  fill = false,
  allowDeselect = false,
  showClearOnSelected = false,
  activeOptionClassName = 'bg-white text-foreground shadow-sm',
  inactiveOptionClassName = 'text-text-muted hover:text-foreground',
  disabledOptionClassName = 'cursor-not-allowed text-text-muted/55',
}) => {
  const sizeStyles = {
    default: {
      wrapper: 'h-10 rounded-xl p-[2px]',
      button: 'rounded-[10px] px-3 text-xs font-bold sm:px-5',
    },
    sm: {
      wrapper: 'h-8 rounded-xl p-0.5',
      button: 'rounded-[9px] px-3 py-1 text-[12px] font-semibold sm:px-4',
    },
  };

  return (
    <div className={cn('inline-flex max-w-full flex-col gap-2', className)}>
      {label && (
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">
          {label}
        </span>
      )}
      <div
        className={cn(
          'max-w-full items-stretch overflow-x-auto bg-black/[0.04]',
          sizeStyles[size].wrapper,
          fill ? 'flex w-full' : 'inline-flex w-fit',
        )}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (opt.disabled) {
                return;
              }
              if (allowDeselect && value === opt.value) {
                onClear?.();
                return;
              }
              onChange(opt.value);
            }}
            title={opt.label}
            disabled={opt.disabled}
            className={cn(
              'relative overflow-hidden text-ellipsis whitespace-nowrap outline-none transition-all duration-200',
              fill ? 'min-w-0 flex-1' : 'flex-none',
              sizeStyles[size].button,
              showClearOnSelected && allowDeselect && value === opt.value && 'pr-7',
              value === opt.value
                ? activeOptionClassName
                : opt.disabled
                  ? disabledOptionClassName
                  : inactiveOptionClassName
            )}
          >
            {opt.label}
            {showClearOnSelected && allowDeselect && value === opt.value && onClear ? (
              <span
                role="button"
                aria-label={`清除${opt.label}筛选`}
                onClick={(event) => {
                  event.stopPropagation();
                  onClear();
                }}
                className="absolute right-2 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-black/5 hover:text-current"
              >
                <X className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
};
