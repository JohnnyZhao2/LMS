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
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  label,
  className,
  activeColor = 'white',
  size = 'default',
}) => {
  const activeStyles = {
    white: 'bg-white text-foreground shadow-sm',
    blue: 'bg-primary text-white shadow-sm',
  };
  const sizeStyles = {
    default: {
      wrapper: 'h-11 rounded-full p-1',
      button: 'rounded-full px-4 text-xs font-bold',
    },
    sm: {
      wrapper: 'h-8 rounded-lg p-0.5',
      button: 'rounded-md px-3 py-1 text-[12px] font-semibold',
    },
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">
          {label}
        </span>
      )}
      <div className={cn('flex w-full items-stretch overflow-x-auto bg-muted/60 no-scrollbar', sizeStyles[size].wrapper)}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 transition-all duration-200 whitespace-nowrap outline-none',
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
