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
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  label,
  className,
  activeColor = 'white',
}) => {
  const activeStyles = {
    white: 'bg-white text-foreground shadow-sm',
    blue: 'bg-primary text-white shadow-sm',
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">
          {label}
        </span>
      )}
      <div className="flex h-11 w-full items-stretch rounded-full bg-muted/60 p-1 overflow-x-auto no-scrollbar">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-full px-4 text-xs font-bold transition-all duration-200 whitespace-nowrap outline-none',
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
