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
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  pageSizeOptions?: (string | number)[];
  className?: string;
  disabled?: boolean;
}

/**
 * Pagination component - replacement for Ant Design Pagination
 */
export const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize,
  onChange,
  onShowSizeChange,
  showSizeChanger = false,
  showTotal,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  disabled = false,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (current - 1) * pageSize + 1;
  const endItem = Math.min(current * pageSize, total);

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

  if (total === 0) return null;

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Total info */}
      {showTotal && (
        <span className="text-sm text-gray-500">
          {showTotal(total, [startItem, endItem])}
        </span>
      )}

      <div className="flex items-center gap-1">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(current - 1)}
          disabled={current === 1 || disabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 w-8 items-center justify-center"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </span>
          ) : (
            <Button
              key={page}
              variant={current === page ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                current === page && 'bg-primary-500 text-white hover:bg-primary-600'
              )}
              onClick={() => handlePageChange(page)}
              disabled={disabled}
            >
              {page}
            </Button>
          )
        )}

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(current + 1)}
          disabled={current === totalPages || disabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Page size selector */}
        {showSizeChanger && (
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[100px] ml-2">
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
        )}
      </div>
    </div>
  );
};
