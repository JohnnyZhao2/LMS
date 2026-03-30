import { Settings2 } from 'lucide-react';

import { UserPickerPanel } from '@/components/common/user-picker-panel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { UserList } from '@/types/common';

import type { ScopeFilterOption } from './user-permission-section.types';

interface UserPermissionScopePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  scopeFilterOptions: ScopeFilterOption[];
  scopeUserFilter: string;
  onScopeFilterChange: (filterValue: string) => void;
  onFilterDoubleClick: (filterValue: string) => void;
  showReset: boolean;
  onReset: () => void;
  scopeUserSearch: string;
  onScopeUserSearchChange: (value: string) => void;
  isAllFilteredScopeUsersSelected: boolean;
  hasPartialFilteredScopeSelection: boolean;
  onToggleSelectAllFilteredScopeUsers: () => void;
  selectedFilteredScopeCount: number;
  filteredScopeUsers: UserList[];
  selectedScopeUserIds: number[];
  onToggleScopeUser: (scopeUserId: number) => void;
  isExplicitUsersScopeSelected: boolean;
  onEnsureExplicitUsersScopeSelected: () => void;
  isScopeUsersLoading: boolean;
  dialogContentElement: HTMLDivElement | null;
}

export const UserPermissionScopePopover: React.FC<UserPermissionScopePopoverProps> = ({
  open,
  onOpenChange,
  summary,
  scopeFilterOptions,
  scopeUserFilter,
  onScopeFilterChange,
  onFilterDoubleClick,
  showReset,
  onReset,
  scopeUserSearch,
  onScopeUserSearchChange,
  isAllFilteredScopeUsersSelected,
  hasPartialFilteredScopeSelection,
  onToggleSelectAllFilteredScopeUsers,
  selectedFilteredScopeCount,
  filteredScopeUsers,
  selectedScopeUserIds,
  onToggleScopeUser,
  isExplicitUsersScopeSelected,
  onEnsureExplicitUsersScopeSelected,
  isScopeUsersLoading,
  dialogContentElement,
}) => (
  <Popover open={open} onOpenChange={onOpenChange} modal={false}>
    <PopoverTrigger
      type="button"
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-xl border px-4 text-xs transition-all duration-200',
        open
          ? 'border-primary/40 bg-primary/[0.04] text-primary ring-4 ring-primary/5'
          : 'border-slate-200/70 bg-white text-slate-700 hover:border-primary/30 hover:bg-slate-50',
      )}
    >
      <span className="font-bold line-clamp-1 text-left">{summary}</span>
      <Settings2
        className={cn(
          'ml-2 h-3.5 w-3.5 shrink-0 transition-all duration-300',
          open ? 'text-primary rotate-90' : 'text-slate-400',
        )}
      />
    </PopoverTrigger>
    <PopoverContent
      align="end"
      className="w-[400px] p-0 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden bg-white"
      container={dialogContentElement}
      sideOffset={8}
    >
      <UserPickerPanel
        users={filteredScopeUsers}
        selectedUserIds={selectedScopeUserIds}
        searchValue={scopeUserSearch}
        onSearchChange={onScopeUserSearchChange}
        onToggleUser={onToggleScopeUser}
        onToggleAllUsers={onToggleSelectAllFilteredScopeUsers}
        isLoading={isScopeUsersLoading}
        filterOptions={scopeFilterOptions}
        activeFilter={scopeUserFilter}
        onFilterChange={onScopeFilterChange}
        onFilterDoubleClick={onFilterDoubleClick}
        showReset={showReset}
        onReset={onReset}
        isAllSelected={isAllFilteredScopeUsersSelected}
        hasPartialSelection={hasPartialFilteredScopeSelection}
        selectedCount={selectedFilteredScopeCount}
        searchPlaceholder="搜索用户..."
        emptyText="无匹配用户"
        loadingText="加载用户列表..."
        onBeforeToggleUser={() => {
          if (!isExplicitUsersScopeSelected) {
            onEnsureExplicitUsersScopeSelected();
          }
        }}
        getUserMeta={(user) => user.department?.name ?? '未分组'}
      />
    </PopoverContent>
  </Popover>
);
