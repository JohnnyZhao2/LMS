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
        'flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#7B8698]',
        className,
      )}
    >
      <Link
        to={homePath}
        aria-label="返回首页"
        className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[#7B8698] transition-colors hover:bg-white/70 hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.title}-${index}`}>
            <ChevronRight className="h-3 w-3 text-border" />
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="truncate rounded-md px-1.5 py-0.5 text-[#7B8698] transition-colors hover:bg-white/70 hover:text-foreground"
              >
                {item.title}
              </Link>
            ) : (
              <span className="truncate rounded-md px-1.5 py-0.5 text-foreground">
                {item.title}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
