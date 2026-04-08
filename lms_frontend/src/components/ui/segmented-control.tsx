/**
 * 分段式控制器组件 - 用于筛选和选项切换
 */
import { cn } from '@/lib/utils';

export interface SegmentedOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  activeColor?: 'white' | 'blue';
  size?: 'default' | 'sm';
  fill?: boolean;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  label,
  className,
  activeColor = 'white',
  size = 'default',
  fill = false,
}) => {
  const activeStyles = {
    white: 'bg-white text-foreground shadow-sm',
    blue: 'bg-white text-foreground shadow-sm',
  };
  const sizeStyles = {
    default: {
      wrapper: 'h-10 rounded-xl p-[2px]',
      button: 'rounded-[10px] px-5 text-xs font-bold',
    },
    sm: {
      wrapper: 'h-8 rounded-xl p-0.5',
      button: 'rounded-[9px] px-4 py-1 text-[12px] font-semibold',
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
          'max-w-full items-stretch overflow-x-auto bg-black/[0.04] no-scrollbar',
          sizeStyles[size].wrapper,
          fill ? 'flex w-full' : 'inline-flex w-fit',
        )}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'transition-all duration-200 whitespace-nowrap outline-none',
              fill ? 'min-w-0 flex-1' : 'flex-none',
              sizeStyles[size].button,
              value === opt.value
                ? activeStyles[activeColor]
                : 'text-text-muted hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
