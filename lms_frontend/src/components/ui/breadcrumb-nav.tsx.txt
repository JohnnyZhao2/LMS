import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  homePath: string;
  className?: string;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  items,
  homePath,
  className,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="页面路径"
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[#7B8698]',
        className,
      )}
    >
      <Link
        to={homePath}
        aria-label="返回首页"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#7B8698] transition-colors hover:bg-white/70 hover:text-foreground"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.title}-${index}`}>
            <ChevronRight className={cn('text-border', isLast ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
            {!isLast && item.path ? (
              <Link
                to={item.path}
                className="truncate rounded-md px-1.5 py-0.5 text-[13px] text-[#7B8698] transition-colors hover:bg-white/70 hover:text-foreground"
              >
                {item.title}
              </Link>
            ) : !isLast ? (
              <span className="truncate rounded-md px-1.5 py-0.5 text-[13px] text-[#7B8698]">
                {item.title}
              </span>
            ) : (
              <span className="truncate rounded-md px-1.5 py-0.5 text-[20px] font-semibold leading-tight tracking-[-0.03em] text-foreground md:text-[22px]">
                {item.title}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
