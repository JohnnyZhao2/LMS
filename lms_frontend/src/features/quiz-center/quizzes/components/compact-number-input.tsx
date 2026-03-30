import React from 'react';

import { cn } from '@/lib/utils';

type NumberMode = 'integer' | 'decimal';

interface CompactNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  dividerBeforeUnit?: boolean;
  prefixLabel?: string;
  className?: string;
  inputClassName?: string;
  inputWidthClassName?: string;
  mode?: NumberMode;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

const INPUT_PATTERN: Record<NumberMode, RegExp> = {
  integer: /^\d*$/,
  decimal: /^\d*(?:\.\d*)?$/,
};

export const CompactNumberInput: React.FC<CompactNumberInputProps> = ({
  value,
  onChange,
  unit,
  dividerBeforeUnit = false,
  prefixLabel,
  className,
  inputClassName,
  inputWidthClassName = 'w-12',
  mode = 'integer',
  placeholder,
  min,
  max,
  step = mode === 'decimal' ? 0.5 : 1,
}) => {
  const decimalPlaces = `${step}`.includes('.') ? `${step}`.split('.')[1]?.length ?? 0 : 0;

  const handleChange = (nextValue: string) => {
    if (!INPUT_PATTERN[mode].test(nextValue)) return;
    onChange(nextValue);
  };

  const formatNumber = (nextNumber: number) => {
    if (mode === 'integer') return String(Math.round(nextNumber));
    if (decimalPlaces === 0) return String(nextNumber);
    return nextNumber.toFixed(decimalPlaces).replace(/\.?0+$/, '');
  };

  const clampNumber = (nextNumber: number) => {
    let clamped = nextNumber;
    if (typeof min === 'number') clamped = Math.max(min, clamped);
    if (typeof max === 'number') clamped = Math.min(max, clamped);
    return clamped;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();

    const delta = event.key === 'ArrowUp' ? step : -step;
    const currentValue = value === '' ? (typeof min === 'number' ? min : 0) : Number(value);
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : (typeof min === 'number' ? min : 0);
    const nextValue = clampNumber(safeCurrentValue + delta);
    onChange(formatNumber(nextValue));
  };

  return (
    <div className={cn('flex items-center gap-2 rounded-md bg-muted px-2.5 py-1', className)}>
      {prefixLabel && (
        <>
          <span className="text-[11px] font-medium text-foreground/60">{prefixLabel}</span>
          <div className="h-3.5 w-px bg-foreground/20" />
        </>
      )}
      <input
        type="text"
        inputMode={mode === 'integer' ? 'numeric' : 'decimal'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          'border-0 bg-transparent p-0 text-center font-medium tabular-nums text-foreground outline-none placeholder:text-text-muted/40',
          'focus:outline-none',
          inputWidthClassName,
          inputClassName,
        )}
      />
      {unit && dividerBeforeUnit && <div className="h-3.5 w-px bg-foreground/20" />}
      {unit && <span className="text-[11px] font-medium text-text-muted">{unit}</span>}
    </div>
  );
};
