import type * as React from 'react';

import { cn } from '@/lib/utils';

interface EditorWorkbenchHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  leftSlot: React.ReactNode;
  centerSlot: React.ReactNode;
  rightSlot: React.ReactNode;
  centerClassName?: string;
}

export function EditorWorkbenchHeader({
  leftSlot,
  centerSlot,
  rightSlot,
  className,
  centerClassName,
  ...props
}: EditorWorkbenchHeaderProps) {
  return (
    <div
      className={cn('grid shrink-0 grid-cols-[1fr_minmax(320px,520px)_1fr] items-center gap-3', className)}
      {...props}
    >
      <div className="flex min-w-0 items-center">
        {leftSlot}
      </div>

      <div className={cn('relative flex h-10 min-w-0 items-center justify-center rounded-xl border border-border bg-background px-5', centerClassName)}>
        {centerSlot}
      </div>

      <div className="flex min-w-0 items-center justify-end">
        {rightSlot}
      </div>
    </div>
  );
}
