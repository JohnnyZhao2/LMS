import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PageShell = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex w-full min-h-0 flex-col gap-8', className)}
      {...props}
    >
      {children}
    </div>
  ),
);

PageShell.displayName = 'PageShell';

export const PageFillShell = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid w-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-8 pb-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

PageFillShell.displayName = 'PageFillShell';

interface ViewportConstraintOptions {
  bottomGap?: number;
  minHeight?: number;
  desktopBreakpoint?: number;
  fixedHeight?: boolean;
}

const getViewportTop = (node: HTMLElement) => {
  let top = 0;
  let current: HTMLElement | null = node;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top - window.scrollY;
};

const useViewportConstraint = ({
  bottomGap = 40,
  minHeight = 520,
  desktopBreakpoint = 1280,
  fixedHeight = false,
}: ViewportConstraintOptions) => {
  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState<number | null>(null);

  const updateHeight = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const node = elementRef.current;
    if (!node || window.innerWidth < desktopBreakpoint) {
      setHeight(null);
      return;
    }

    const availableHeight = Math.floor(window.innerHeight - getViewportTop(node) - bottomGap);
    setHeight(Math.max(minHeight, availableHeight));
  }, [bottomGap, desktopBreakpoint, minHeight]);

  React.useLayoutEffect(() => {
    updateHeight();
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let frameId = 0;

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateHeight);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
    };
  }, [updateHeight]);

  const style = height === null
    ? undefined
    : fixedHeight
      ? { height: `${height}px` }
      : { maxHeight: `${height}px` };

  return { elementRef, style };
};

interface PageViewportProps extends React.HTMLAttributes<HTMLDivElement>, ViewportConstraintOptions {}

export const EditorPageShell = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-muted/20 py-2', className)}
      {...props}
    />
  ),
);

EditorPageShell.displayName = 'EditorPageShell';

export const PageViewport = React.forwardRef<HTMLDivElement, PageViewportProps>(
  ({ className, style, bottomGap, minHeight, desktopBreakpoint, ...props }, ref) => {
    const { elementRef, style: constrainedStyle } = useViewportConstraint({
      bottomGap,
      minHeight,
      desktopBreakpoint,
    });

    return (
      <div
        ref={(node) => {
          elementRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn('flex w-full min-h-0 max-h-full self-start flex-col overflow-hidden', className)}
        style={{ ...constrainedStyle, ...style }}
        {...props}
      />
    );
  },
);

PageViewport.displayName = 'PageViewport';

export const PageWorkbench = React.forwardRef<HTMLDivElement, PageViewportProps>(
  ({ className, style, bottomGap, minHeight, desktopBreakpoint, ...props }, ref) => {
    const { elementRef, style: constrainedStyle } = useViewportConstraint({
      bottomGap,
      minHeight,
      desktopBreakpoint,
      fixedHeight: true,
    });

    return (
      <div
        ref={(node) => {
          elementRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn('flex h-full w-full min-h-0 flex-col overflow-hidden', className)}
        style={{ ...constrainedStyle, ...style }}
        {...props}
      />
    );
  },
);

PageWorkbench.displayName = 'PageWorkbench';

export const PageSplit = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('grid min-h-0 items-stretch gap-6', className)}
      {...props}
    />
  ),
);

PageSplit.displayName = 'PageSplit';
