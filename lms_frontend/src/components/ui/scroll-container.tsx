import * as React from 'react';

import { cn } from '@/lib/utils';

type ScrollContainerElement = 'div' | 'nav' | 'section' | 'aside' | 'main';

interface ScrollContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: ScrollContainerElement;
  scrollbar?: 'subtle' | 'inherit';
}

export function ScrollContainer({
  as = 'div',
  scrollbar = 'subtle',
  className,
  children,
  ...props
}: ScrollContainerProps) {
  const Component = as as React.ElementType;

  return (
    <Component className={cn(scrollbar === 'subtle' && 'scrollbar-subtle', className)} {...props}>
      {children}
    </Component>
  );
}
