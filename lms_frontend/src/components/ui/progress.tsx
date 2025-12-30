import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showInfo?: boolean;
  strokeColor?: string;
  trailColor?: string;
  size?: 'sm' | 'default' | 'lg';
  // Ant Design compatibility props
  percent?: number;
}

const sizeClasses = {
  sm: 'h-1',
  default: 'h-2',
  lg: 'h-3',
};

/**
 * Progress component - replacement for Ant Design Progress
 */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      percent,
      max = 100,
      showInfo = false,
      strokeColor = 'var(--color-primary-500)',
      trailColor = 'var(--color-gray-100)',
      size = 'default',
      ...props
    },
    ref
  ) => {
    // Support both value and percent (Ant Design compatibility)
    const progressValue = percent ?? value ?? 0;
    const percentage = Math.min(Math.max(progressValue, 0), max);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div
          className={cn('w-full rounded-full overflow-hidden', sizeClasses[size])}
          style={{ backgroundColor: trailColor }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${(percentage / max) * 100}%`,
              backgroundColor: strokeColor,
            }}
          />
        </div>
        {showInfo && (
          <span className="ml-2 text-sm text-gray-600">{Math.round(percentage)}%</span>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';
