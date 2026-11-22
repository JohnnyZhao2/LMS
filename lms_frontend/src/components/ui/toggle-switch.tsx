import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (nextChecked: boolean) => void;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  disabled = false,
  onCheckedChange,
  className,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onCheckedChange(!checked);
    }}
    className={cn(
      'relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-all duration-200',
      checked
        ? 'border-primary-200 bg-primary-50/90'
        : 'border-slate-300/90 bg-slate-200/90 hover:border-slate-400/80 hover:bg-slate-200',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    )}
  >
    <span
      className={cn(
        'absolute top-[1px] h-3 w-3 rounded-full transition-all duration-200',
        checked
          ? 'left-[0.85rem] bg-primary shadow-[0_2px_6px_rgba(15,23,42,0.12)]'
          : 'left-[1px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]',
      )}
    />
  </button>
);
