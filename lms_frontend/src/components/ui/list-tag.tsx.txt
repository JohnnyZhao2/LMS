import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const listTagVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent font-medium leading-none tracking-[-0.01em] shadow-none transition-colors [&_svg]:shrink-0',
  {
    variants: {
      size: {
        xs: 'h-4.5 px-1.5 text-[11px]',
        sm: 'h-5 px-2 text-[11.5px]',
        md: 'h-6 px-2.5 text-[13px]',
      },
      tone: {
        neutral: 'bg-muted/85 text-text-muted',
        primary: 'bg-primary-100/70 text-text-muted',
        secondary: 'bg-secondary-100/70 text-text-muted',
        warning: 'bg-warning-100/70 text-text-muted',
        destructive: 'bg-destructive-100/70 text-text-muted',
      },
    },
    defaultVariants: {
      size: 'sm',
      tone: 'neutral',
    },
  }
);

export interface ListTagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof listTagVariants> {}

export const ListTag: React.FC<ListTagProps> = ({
  className,
  size,
  tone,
  children,
  ...props
}) => (
  <span className={cn(listTagVariants({ size, tone }), className)} {...props}>
    {children}
  </span>
);
