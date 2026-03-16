import { Loader2, Settings2, Users } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
          : 'border-slate-200/70 bg-white text-slate-700 hover:border-primary/30 hover:bg-slate-50/50',
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
        {/* 左侧：快速筛选 */}
        <div className="w-[72px] shrink-0 border-r border-slate-100 bg-slate-50/80 py-2 px-1.5 flex flex-col gap-0.5">
          {scopeFilterOptions.map((option) => {
            const isActive = scopeUserFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onScopeFilterChange(option.value)}
                onDoubleClick={() => onFilterDoubleClick(option.value)}
                className={cn(
                  'w-full py-1.5 rounded-md text-[11px] font-bold text-center transition-all duration-200 active:scale-95',
                  isActive
                    ? 'bg-white text-primary shadow-sm border border-primary/15'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/70 border border-transparent',
                )}
              >
                {option.label}
              </button>
            );
          })}
          {showReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-auto w-full py-1.5 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors duration-200 text-center"
            >
              重置
            </button>
          )}
        </div>

        {/* 右侧：搜索 + 列表 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 搜索 + 全选 */}
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-slate-100/80">
            <Input
              value={scopeUserSearch}
              onChange={(event) => onScopeUserSearchChange(event.target.value)}
              placeholder="搜索用户..."
              className="h-8 flex-1 min-w-0 pl-3 text-[11px] bg-white border-slate-200/60 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/30 placeholder:text-slate-300"
            />
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <Checkbox
                checked={isAllFilteredScopeUsersSelected ? true : hasPartialFilteredScopeSelection ? 'indeterminate' : false}
                onCheckedChange={onToggleSelectAllFilteredScopeUsers}
                className="rounded-[3px]"
              />
              <span className="text-[10px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
                {selectedFilteredScopeCount}/{filteredScopeUsers.length}
              </span>
            </label>
          </div>

          {/* 用户列表 */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2 space-y-0.5 scrollbar-subtle"
            onWheel={(event) => event.stopPropagation()}
          >
            {isScopeUsersLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="w-4 h-4 text-slate-300 animate-spin mx-auto mb-1.5" />
                <span className="text-[11px] text-slate-400">加载用户列表...</span>
              </div>
            ) : filteredScopeUsers.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-slate-400">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4 text-slate-300" />
                </div>
                无匹配用户
              </div>
            ) : (
              filteredScopeUsers.map((scopeUser) => {
                const selected = selectedScopeUserIds.includes(scopeUser.id);
                return (
                  <label
                    key={scopeUser.id}
                    className={cn(
                      'flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition-all duration-150',
                      selected
                        ? 'bg-primary/[0.06] border border-primary/10'
                        : 'hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm',
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => {
                        onToggleScopeUser(scopeUser.id);
                        if (!isExplicitUsersScopeSelected) {
                          onEnsureExplicitUsersScopeSelected();
                        }
                      }}
                      className="rounded-[3px] shrink-0"
                    />
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors',
                          selected
                            ? 'bg-primary/15 text-primary'
                            : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {scopeUser.username.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'text-[12px] font-semibold block truncate transition-colors',
                            selected ? 'text-primary' : 'text-slate-700',
                          )}
                        >
                          {scopeUser.username}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">{scopeUser.department.name}</span>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);
