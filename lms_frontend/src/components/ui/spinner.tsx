import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg';
  spinning?: boolean;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * Spinner component - replacement for Ant Design Spin
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'default', spinning = true, children, ...props }, ref) => {
    if (!spinning && children) {
      return <>{children}</>;
    }

    const spinner = (
      <Loader2
        className={cn('animate-spin text-primary-500', sizeClasses[size])}
      />
    );

    if (children) {
      return (
        <div ref={ref} className={cn('relative', className)} {...props}>
          {spinning && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              {spinner}
            </div>
          )}
          <div className={cn(spinning && 'opacity-50 pointer-events-none')}>
            {children}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
      >
        {spinner}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export { Spinner as Spin };
