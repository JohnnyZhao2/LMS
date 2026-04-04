import { Settings2 } from 'lucide-react';

import { UserSelectList } from '@/components/common/user-select-list';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { GHOST_ACCENT_HOVER_CLASSNAME } from '@/components/ui/interactive-styles';
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
          : 'border-border/70 bg-white text-slate-700 hover:border-primary-200 hover:bg-primary-50/30',
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
      <div className="flex h-[300px]">
        <div className="flex w-[72px] shrink-0 flex-col gap-0.5 border-r border-slate-100 bg-slate-50 px-1.5 py-2">
          {scopeFilterOptions.map((option) => {
            const isActive = scopeUserFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onScopeFilterChange(option.value)}
                onDoubleClick={() => onFilterDoubleClick(option.value)}
                className={cn(
                  'w-full rounded-md border py-1.5 text-center text-[11px] font-bold transition-all duration-200 active:scale-95',
                  isActive
                    ? 'border-primary/15 bg-white text-primary shadow-sm'
                    : 'border-transparent text-slate-500 hover:bg-primary-50/70 hover:text-slate-700',
                )}
              >
                {option.label}
              </button>
            );
          })}
          {showReset ? (
            <button
              type="button"
              onClick={onReset}
              className="mt-auto w-full py-1.5 text-center text-[10px] font-bold text-slate-400 transition-colors duration-200 hover:text-primary"
            >
              重置
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100/80 px-3 py-2.5">
            <Input
              value={scopeUserSearch}
              onChange={(event) => onScopeUserSearchChange(event.target.value)}
              placeholder="搜索用户..."
              className="h-8 flex-1 min-w-0 rounded-lg border-slate-200/60 bg-white pl-3 text-[11px] shadow-none placeholder:text-slate-300 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20"
            />
            <label className={cn('inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 py-1.5', GHOST_ACCENT_HOVER_CLASSNAME)}>
              <Checkbox
                checked={isAllFilteredScopeUsersSelected ? true : hasPartialFilteredScopeSelection ? 'indeterminate' : false}
                onCheckedChange={onToggleSelectAllFilteredScopeUsers}
                className="rounded-[3px]"
              />
              <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-slate-500">
                {selectedFilteredScopeCount}/{filteredScopeUsers.length}
              </span>
            </label>
          </div>

          <UserSelectList
            items={filteredScopeUsers.map((user) => ({
              id: user.id,
              name: user.username,
              avatarKey: user.avatar_key,
              meta: user.department?.name ?? '未分组',
            }))}
            selectedIds={selectedScopeUserIds}
            onSelect={onToggleScopeUser}
            isLoading={isScopeUsersLoading}
            emptyText="无匹配用户"
            loadingText="加载用户列表..."
            onBeforeSelect={() => {
              if (!isExplicitUsersScopeSelected) {
                onEnsureExplicitUsersScopeSelected();
              }
            }}
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>
);
