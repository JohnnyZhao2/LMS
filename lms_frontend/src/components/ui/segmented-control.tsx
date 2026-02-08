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
  activeColor?: 'gray' | 'blue' | 'white';
  variant?: 'default' | 'premium';
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  label,
  className,
  activeColor = 'gray',
  variant = 'default',
}) => {
  const activeStyles = {
    gray: 'bg-foreground text-background',
    blue: 'bg-primary text-white',
    white: 'bg-background text-foreground',
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span
          className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1"
        >
          {label}
        </span>
      )}
      <div className={cn(
        'flex w-full p-1 rounded-md overflow-x-auto no-scrollbar',
        variant === 'premium' ? 'bg-muted' : 'bg-background'
      )}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 px-6 py-2.5 text-xs font-bold rounded-md transition-all duration-200 whitespace-nowrap border-none outline-none ring-0',
              value === opt.value
                ? activeStyles[activeColor]
                : 'text-text-muted hover:text-foreground hover:bg-muted'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
