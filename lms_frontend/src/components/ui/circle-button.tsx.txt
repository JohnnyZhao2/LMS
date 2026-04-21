import * as React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
}

export const CircleButton = React.forwardRef<HTMLButtonElement, CircleButtonProps>(
  ({ label, icon, className, type = 'button', title, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={title ?? label}
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-primary text-white shadow-sm transition-all duration-200',
          'hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {icon ?? <Plus className="h-4 w-4" />}
      </button>
    );
  }
);

CircleButton.displayName = 'CircleButton';
