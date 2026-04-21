import * as React from 'react';

import { cn } from '@/lib/utils';

interface SelectionIndicatorProps {
  color: string;
  selected: boolean;
  className?: string;
  size?: number;
  strokeWidth?: number;
  dotSize?: number;
}

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  color,
  selected,
  className,
  size = 16,
  strokeWidth = 2,
  dotSize = size >= 16 ? 6 : 5,
}) => {
  const center = size / 2;
  const outerRadius = center - strokeWidth / 2;

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, color }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill={selected ? 'currentColor' : 'transparent'}
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {selected ? <circle cx={center} cy={center} r={dotSize / 2} fill="#fff" /> : null}
      </svg>
    </span>
  );
};
