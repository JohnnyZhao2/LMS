import * as React from 'react';

import { cn } from '@/lib/utils';

type ScrollContainerElement = 'div' | 'nav' | 'section' | 'aside' | 'main';

interface ScrollContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: ScrollContainerElement;
}

export function ScrollContainer({
  as = 'div',
  className,
  children,
  ...props
}: ScrollContainerProps) {
  const Component = as as React.ElementType;

  return (
    <Component className={cn('scrollbar-subtle', className)} {...props}>
      {children}
    </Component>
  );
}
