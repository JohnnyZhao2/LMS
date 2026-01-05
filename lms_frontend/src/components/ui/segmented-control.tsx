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
  activeColor?: 'gray' | 'blue';
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  label,
  className,
  activeColor = 'gray',
}) => {
  const activeStyles = {
    gray: 'bg-gray-900 text-white',
    blue: 'bg-blue-600 text-white',
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span
          className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {label}
        </span>
      )}
      <div className="flex bg-white p-1 rounded-md shadow-none overflow-x-auto no-scrollbar">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 whitespace-nowrap',
              value === opt.value
                ? `${activeStyles[activeColor]} shadow-none`
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
