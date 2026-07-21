import * as React from 'react';

import { cn } from '@/lib/utils';

type ScrollContainerElement = 'div' | 'nav' | 'section' | 'aside' | 'main';

interface ScrollContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: ScrollContainerElement;
  scrollbar?: 'subtle' | 'hidden' | 'inherit';
}

export const ScrollContainer = React.forwardRef<HTMLElement, ScrollContainerProps>(function ScrollContainer({
  as = 'div',
  scrollbar = 'subtle',
  className,
  children,
  ...props
}, ref) {
  const Component = as as React.ElementType;

  return (
    <Component
      ref={ref}
      className={cn(
        scrollbar === 'subtle' && 'scrollbar-subtle',
        scrollbar === 'hidden' && 'scrollbar-hidden',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
