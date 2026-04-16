import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const listTagVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border bg-background font-semibold leading-none tracking-[-0.01em] transition-colors [&_svg]:shrink-0',
  {
    variants: {
      size: {
        xs: 'h-4.5 px-1.5 text-[10px]',
        sm: 'h-5 px-2 text-[11px]',
        md: 'h-6 px-2.5 text-[12px]',
      },
      tone: {
        neutral: 'border-border/80 text-foreground/75',
        primary: 'border-primary-200 text-primary-700',
        secondary: 'border-secondary-200 text-secondary-700',
        warning: 'border-warning-200 text-warning-700',
        destructive: 'border-destructive-200 text-destructive-700',
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
