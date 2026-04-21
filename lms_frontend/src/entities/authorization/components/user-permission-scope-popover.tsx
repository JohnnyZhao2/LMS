import { Settings2 } from 'lucide-react';

import { UserSelectList } from '@/components/common/user-select-list';
import { Checkbox } from '@/components/ui/checkbox';
import { GHOST_ACCENT_HOVER_CLASSNAME } from '@/components/ui/interactive-styles';
import { SearchInput } from '@/components/ui/search-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PermissionOverrideScope } from '@/types/authorization';
import type { UserList } from '@/types/common';

import type { ScopeFilterOption } from './user-permission-section.types';

interface UserPermissionScopePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  scopeFilterOptions: ScopeFilterOption[];
  availableScopeTypes: PermissionOverrideScope[];
  selectedPermissionScopes: PermissionOverrideScope[];
  onSelectPresetScope: (scopeType: PermissionOverrideScope) => void;
  scopeUserFilter: string;
  onScopeFilterChange: (filterValue: string) => void;
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

const SCOPE_TYPE_LABELS: Record<PermissionOverrideScope, string> = {
  ALL: '全部',
  SELF: '本人',
  MENTEES: '名下',
  DEPARTMENT: '同部门',
  EXPLICIT_USERS: '指定用户',
};

export const UserPermissionScopePopover: React.FC<UserPermissionScopePopoverProps> = ({
  open,
  onOpenChange,
  summary,
  scopeFilterOptions,
  availableScopeTypes,
  selectedPermissionScopes,
  onSelectPresetScope,
  scopeUserFilter,
  onScopeFilterChange,
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
}) => {
  const canSelectExplicitScopeUsers = availableScopeTypes.includes('EXPLICIT_USERS');

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger
        type="button"
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border px-4 text-xs transition-all duration-200',
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
        className={cn(
          'p-0 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden bg-white',
          canSelectExplicitScopeUsers ? 'w-[400px]' : 'w-[180px]',
        )}
        container={dialogContentElement}
        sideOffset={8}
      >
        {canSelectExplicitScopeUsers ? (
          <div className="flex h-[320px]">
            <div className="flex w-[88px] shrink-0 flex-col gap-0.5 border-r border-slate-100 bg-slate-50 px-1.5 py-2">
              {scopeFilterOptions.map((option) => {
                const isActive = scopeUserFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onScopeFilterChange(option.value)}
                    className={cn(
                      'w-full rounded-md border py-1.5 text-center text-[10px] font-bold transition-all duration-200',
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
                  className="mt-auto w-full py-1.5 text-center text-[9px] font-bold text-slate-400 transition-colors duration-200 hover:text-primary"
                >
                  重置
                </button>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-w-0 items-center gap-2 border-b border-slate-100/80 px-3 py-2">
                <SearchInput
                  value={scopeUserSearch}
                  onChange={onScopeUserSearchChange}
                  placeholder="搜索用户..."
                  inputClassName="h-7 rounded-lg border-slate-200/60 bg-white pl-8 text-[10px] shadow-none placeholder:text-slate-300 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20"
                />
                <label className={cn('inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 py-1.5', GHOST_ACCENT_HOVER_CLASSNAME)}>
                  <Checkbox
                    checked={isAllFilteredScopeUsersSelected ? true : hasPartialFilteredScopeSelection ? 'indeterminate' : false}
                    onCheckedChange={onToggleSelectAllFilteredScopeUsers}
                    className="rounded-[3px]"
                  />
                  <span className="whitespace-nowrap text-[9px] font-bold tabular-nums text-slate-500">
                    {selectedFilteredScopeCount}/{filteredScopeUsers.length}
                  </span>
                </label>
              </div>

              <UserSelectList
                items={filteredScopeUsers.map((user) => ({
                  id: user.id,
                  name: user.username,
                  avatarKey: user.avatar_key,
                  meta: user.department?.name
                    ? `${user.employee_id || '未填写工号'} · ${user.department.name}`
                    : (user.employee_id || '未填写工号'),
                }))}
                selectedIds={selectedScopeUserIds}
                onSelect={onToggleScopeUser}
                selectionMode="multiple"
                appearance="panel"
                density="compact"
                isLoading={isScopeUsersLoading}
                emptyText="无匹配用户"
                loadingText="加载用户列表..."
                listClassName="space-y-[6px]"
                onBeforeSelect={() => {
                  if (!isExplicitUsersScopeSelected) {
                    onEnsureExplicitUsersScopeSelected();
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {availableScopeTypes.map((scopeType) => {
              const isActive = selectedPermissionScopes.includes(scopeType);
              return (
                <button
                  key={scopeType}
                  type="button"
                  onClick={() => onSelectPresetScope(scopeType)}
                  className={cn(
                    'flex h-8 w-full items-center justify-between rounded-md px-2.5 text-xs font-bold transition-colors duration-150',
                    isActive
                      ? 'border border-primary/15 bg-primary-50/80 text-primary'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <span>{SCOPE_TYPE_LABELS[scopeType]}</span>
                </button>
              );
            })}
            {showReset ? (
              <button
                type="button"
                onClick={onReset}
                className="mt-1 h-7 w-full rounded-md text-[10px] font-bold text-slate-400 transition-colors duration-150 hover:bg-slate-50 hover:text-primary"
              >
                重置
              </button>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
