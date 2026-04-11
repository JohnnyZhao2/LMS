import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  defaultPageSize?: number;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  pageSizeOptions?: (string | number)[];
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

/**
 * Pagination component - replacement for Ant Design Pagination
 */
export const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize,
  defaultPageSize,
  onChange,
  onShowSizeChange,
  showSizeChanger = false,
  showTotal,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  disabled = false,
  variant = 'default',
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const shouldShowPager = totalPages > 1;
  const resolvedDefaultPageSize = defaultPageSize ?? pageSize;
  const shouldRenderPagination = shouldShowPager || (showSizeChanger && pageSize !== resolvedDefaultPageSize);
  const startItem = (current - 1) * pageSize + 1;
  const endItem = Math.min(current * pageSize, total);
  const isCompact = variant === 'compact';

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === current || disabled) return;
    onChange?.(page, pageSize);
  };

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize, 10);
    const newPage = Math.min(current, Math.ceil(total / size));
    onShowSizeChange?.(newPage, size);
    onChange?.(newPage, size);
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (total === 0 || !shouldRenderPagination) return null;

  return (
    <div
      className={cn(
        'flex items-center',
        isCompact ? 'gap-2.5' : 'gap-4',
        showTotal ? 'justify-between' : 'justify-end',
        className
      )}
    >
      {/* Total info */}
      {showTotal && (
        <span className={cn('text-text-muted', isCompact ? 'text-xs' : 'text-sm')}>
          {showTotal(total, [startItem, endItem])}
        </span>
      )}

      <div className={cn('flex items-center', isCompact ? 'gap-0.5' : 'gap-1')}>
        {shouldShowPager && (
          <>
            <Button
              variant="outline"
              size="sm"
              className={cn(isCompact ? 'h-7 w-7 rounded-md p-0' : 'h-8 w-8 p-0')}
              onClick={() => handlePageChange(current - 1)}
              disabled={current === 1 || disabled}
            >
              <ChevronLeft className={cn(isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </Button>

            {getPageNumbers().map((page, index) =>
              page === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className={cn(
                    'flex items-center justify-center',
                    isCompact ? 'h-7 w-7' : 'h-8 w-8',
                  )}
                >
                  <MoreHorizontal className={cn('text-text-muted', isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                </span>
              ) : (
                <Button
                  key={page}
                  variant={current === page ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    isCompact ? 'h-7 w-7 rounded-md p-0 text-[12px]' : 'h-8 w-8 p-0',
                    current === page && 'bg-primary text-white hover:bg-primary-hover'
                  )}
                  onClick={() => handlePageChange(page)}
                  disabled={disabled}
                >
                  {page}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              className={cn(isCompact ? 'h-7 w-7 rounded-md p-0' : 'h-8 w-8 p-0')}
              onClick={() => handlePageChange(current + 1)}
              disabled={current === totalPages || disabled}
            >
              <ChevronRight className={cn(isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </Button>
          </>
        )}

        {showSizeChanger && (
          <div className={cn(isCompact ? 'w-[96px]' : 'w-[110px]', shouldShowPager && (isCompact ? 'ml-1.5' : 'ml-2'))}>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
              disabled={disabled}
            >
              <SelectTrigger className={cn(isCompact ? 'h-7 rounded-md px-2.5 text-xs' : 'h-8 rounded-md px-3 text-sm')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} 条/页
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
