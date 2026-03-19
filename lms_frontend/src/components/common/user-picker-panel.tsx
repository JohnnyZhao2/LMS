import { Loader2, Users } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface UserPickerUser {
  id: number;
  username: string;
  employee_id?: string;
  department?: {
    id?: number | null;
    name?: string | null;
  } | null;
}

export interface UserPickerFilterOption {
  value: string;
  label: string;
}

interface UserPickerPanelProps<TUser extends UserPickerUser> {
  users: TUser[];
  selectedUserIds: number[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleUser: (userId: number) => void;
  onToggleAllUsers: () => void;
  isLoading?: boolean;
  filterOptions?: UserPickerFilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterValue: string) => void;
  onFilterDoubleClick?: (filterValue: string) => void;
  showReset?: boolean;
  onReset?: () => void;
  isAllSelected?: boolean;
  hasPartialSelection?: boolean;
  selectedCount?: number;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  className?: string;
  listClassName?: string;
  onBeforeToggleUser?: () => void;
  getUserMeta?: (user: TUser) => string;
}

export const UserPickerPanel = <TUser extends UserPickerUser>({
  users,
  selectedUserIds,
  searchValue,
  onSearchChange,
  onToggleUser,
  onToggleAllUsers,
  isLoading = false,
  filterOptions = [],
  activeFilter,
  onFilterChange,
  onFilterDoubleClick,
  showReset = false,
  onReset,
  isAllSelected,
  hasPartialSelection,
  selectedCount,
  searchPlaceholder = '搜索用户...',
  emptyText = '无匹配用户',
  loadingText = '加载用户列表...',
  className,
  listClassName,
  onBeforeToggleUser,
  getUserMeta,
}: UserPickerPanelProps<TUser>) => {
  const computedSelectedCount = users.filter((user) => selectedUserIds.includes(user.id)).length;
  const resolvedSelectedCount = selectedCount ?? computedSelectedCount;
  const resolvedIsAllSelected = isAllSelected ?? (users.length > 0 && resolvedSelectedCount === users.length);
  const resolvedHasPartialSelection = hasPartialSelection ?? (resolvedSelectedCount > 0 && !resolvedIsAllSelected);
  const hasFilterSidebar = filterOptions.length > 0;

  return (
    <div className={cn('flex h-[300px]', className)}>
      {hasFilterSidebar && (
        <div className="w-[72px] shrink-0 border-r border-slate-100 bg-slate-50/80 py-2 px-1.5 flex flex-col gap-0.5">
          {filterOptions.map((option) => {
            const isActive = activeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange?.(option.value)}
                onDoubleClick={() => onFilterDoubleClick?.(option.value)}
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
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-2.5 flex items-center gap-2 border-b border-slate-100/80">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 flex-1 min-w-0 pl-3 text-[11px] bg-white border-slate-200/60 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/30 placeholder:text-slate-300"
          />
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            <Checkbox
              checked={resolvedIsAllSelected ? true : resolvedHasPartialSelection ? 'indeterminate' : false}
              onCheckedChange={onToggleAllUsers}
              className="rounded-[3px]"
            />
            <span className="text-[10px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
              {resolvedSelectedCount}/{users.length}
            </span>
          </label>
        </div>

        <div
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain px-2.5 py-2 space-y-0.5 scrollbar-subtle',
            listClassName,
          )}
          onWheel={(event) => event.stopPropagation()}
        >
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin mx-auto mb-1.5" />
              <span className="text-[11px] text-slate-400">{loadingText}</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-400">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4 text-slate-300" />
              </div>
              {emptyText}
            </div>
          ) : (
            users.map((user) => {
              const selected = selectedUserIds.includes(user.id);
              const userMeta = getUserMeta?.(user) ?? user.department?.name ?? '未分组';
              return (
                <label
                  key={user.id}
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
                      onBeforeToggleUser?.();
                      onToggleUser(user.id);
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
                      {user.username.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'text-[12px] font-semibold block truncate transition-colors',
                          selected ? 'text-primary' : 'text-slate-700',
                        )}
                      >
                        {user.username}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{userMeta}</span>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
