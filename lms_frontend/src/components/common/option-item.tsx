import * as React from 'react';
import { cn } from '@/lib/utils';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * 选项项组件
 *
 * 用于单选、多选题的选项展示，提供统一的样式和交互
 *
 * @example
 * <OptionItem
 *   type="radio"
 *   optionKey="A"
 *   label="选项内容"
 *   value="A"
 *   isSelected={false}
 *   onChange={(value) => console.log(value)}
 * />
 */
export interface OptionItemProps {
  /** 选项类型 */
  type: 'radio' | 'checkbox';

  /** 选项键（如 A, B, C, D） */
  optionKey: string;

  /** 选项文本 */
  label: string;

  /** 选项值 */
  value: string;

  /** 是否选中 */
  isSelected: boolean;

  /** 是否禁用 */
  disabled?: boolean;

  /** 唯一 ID（用于 label 的 htmlFor） */
  id: string;

  /** 变更回调 */
  onChange: (value: string, checked: boolean) => void;

  /** 自定义类名 */
  className?: string;
}

/**
 * 选项项组件
 */
export const OptionItem: React.FC<OptionItemProps> = ({
  type,
  optionKey,
  label,
  value,
  isSelected,
  disabled = false,
  id,
  onChange,
  className,
}) => {
  const handleChange = (checked: boolean | string) => {
    if (type === 'radio') {
      // Radio 返回 string (value)
      onChange(value, true);
    } else {
      // Checkbox 返回 boolean
      onChange(value, checked === true);
    }
  };

  return (
    <label
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer',
        'bg-gray-50 border-gray-200 hover:bg-gray-100',
        isSelected && 'border-primary-500 bg-primary-50',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      {type === 'radio' ? (
        <RadioGroupItem value={value} id={id} disabled={disabled} />
      ) : (
        <Checkbox
          id={id}
          checked={isSelected}
          onCheckedChange={handleChange}
          disabled={disabled}
        />
      )}
      <span className="flex-1 text-gray-900">
        <span className="font-medium">{optionKey}.</span> <span>{label}</span>
      </span>
    </label>
  );
};
