import * as React from 'react';
import { cva } from 'class-variance-authority';
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

const optionItemVariants = cva(
  'flex items-start gap-3 p-4 rounded-xl border transition-all',
  {
    variants: {
      state: {
        default: 'bg-muted border-border hover:bg-muted cursor-pointer',
        selected: 'border-primary bg-primary/10 cursor-pointer',
        disabled: 'cursor-not-allowed opacity-60',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

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

  const state = disabled ? 'disabled' : isSelected ? 'selected' : 'default';

  return (
    <label
      className={cn(
        optionItemVariants({ state }),
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
      <span className="flex-1 text-foreground">
        <span className="font-medium">{optionKey}.</span> <span>{label}</span>
      </span>
    </label>
  );
};
