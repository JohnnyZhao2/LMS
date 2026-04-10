import * as React from 'react';

import { SearchInput, DESKTOP_SEARCH_INPUT_CLASSNAME } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

interface FilterOption {
  label: string;
  value: string;
}

interface UserDirectoryFiltersProps {
  departmentOptions: FilterOption[];
  selectedDepartmentId: string;
  onDepartmentChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  layout?: 'responsive' | 'stacked';
  leftExtra?: React.ReactNode;
  rightExtra?: React.ReactNode;
  className?: string;
}

export const UserDirectoryFilters: React.FC<UserDirectoryFiltersProps> = ({
  departmentOptions,
  selectedDepartmentId,
  onDepartmentChange,
  search,
  onSearchChange,
  searchPlaceholder,
  layout = 'responsive',
  leftExtra,
  rightExtra,
  className,
}) => (
  <div
    className={cn(
      'mb-1 flex min-w-0 flex-col gap-3 pb-3',
      layout === 'responsive' && 'xl:flex-row xl:items-center xl:justify-between',
      className,
    )}
  >
    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
      <SegmentedControl
        options={departmentOptions}
        value={selectedDepartmentId}
        onChange={onDepartmentChange}
        className={cn(
          'w-full',
          layout === 'responsive' && 'md:w-auto md:shrink-0',
        )}
        fill={!leftExtra}
      />
      {leftExtra}
    </div>

    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <SearchInput
        className={DESKTOP_SEARCH_INPUT_CLASSNAME}
        placeholder={searchPlaceholder}
        value={search}
        onChange={onSearchChange}
      />
      {rightExtra}
    </div>
  </div>
);
