import { Check, Loader2, Search, Users } from 'lucide-react';

import { UserAvatar } from '@/components/common/user-avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface UserSelectPanelItem {
  id: number;
  name: string;
  avatarKey?: string | null;
  meta?: string | null;
  count?: number;
  disabled?: boolean;
}

export interface UserSelectPanelOption {
  value: string;
  label: string;
}

interface UserSelectPanelProps {
  items: UserSelectPanelItem[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  onBeforeSelect?: () => void;
  selectionMode?: 'single' | 'multiple';
  variant?: 'panel' | 'plain';
  title?: string;
  titleCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  controlsClassName?: string;
  controlsInnerClassName?: string;
  listClassName?: string;
  itemsClassName?: string;
  segments?: UserSelectPanelOption[];
  activeSegment?: string;
  onSegmentChange?: (value: string) => void;
  sidebarFilters?: UserSelectPanelOption[];
  activeSidebarFilter?: string;
  onSidebarFilterChange?: (value: string) => void;
  onSidebarFilterDoubleClick?: (value: string) => void;
  showSidebarReset?: boolean;
  onSidebarReset?: () => void;
  onToggleAll?: () => void;
  isAllSelected?: boolean;
  hasPartialSelection?: boolean;
  selectedCount?: number;
}

function getSegmentGridClass(length: number): string {
  if (length === 2) {
    return '[&>div]:grid-cols-2';
  }
  if (length === 3) {
    return '[&>div]:grid-cols-3';
  }
  if (length === 4) {
    return '[&>div]:grid-cols-4';
  }
  return '';
}

export function UserSelectPanel({
  items,
  selectedIds,
  onSelect,
  onBeforeSelect,
  selectionMode = 'multiple',
  variant = 'panel',
  title,
  titleCount,
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜索成员...',
  emptyText = '暂无成员',
  isLoading = false,
  loadingText = '加载中...',
  className,
  controlsClassName,
  controlsInnerClassName,
  listClassName,
  itemsClassName,
  segments = [],
  activeSegment,
  onSegmentChange,
  sidebarFilters = [],
  activeSidebarFilter,
  onSidebarFilterChange,
  onSidebarFilterDoubleClick,
  showSidebarReset = false,
  onSidebarReset,
  onToggleAll,
  isAllSelected,
  hasPartialSelection,
  selectedCount,
}: UserSelectPanelProps) {
  const showSearch = typeof onSearchChange === 'function';
  const showSegments = segments.length > 0 && typeof onSegmentChange === 'function' && typeof activeSegment === 'string';
  const showSidebarFilters = sidebarFilters.length > 0;
  const showSelectAll = typeof onToggleAll === 'function';
  const showControls = showSegments || showSearch || showSelectAll;
  const computedSelectedCount = items.filter((item) => selectedIds.includes(item.id)).length;
  const resolvedSelectedCount = selectedCount ?? computedSelectedCount;
  const resolvedIsAllSelected = isAllSelected ?? (items.length > 0 && resolvedSelectedCount === items.length);
  const resolvedHasPartialSelection = hasPartialSelection ?? (resolvedSelectedCount > 0 && !resolvedIsAllSelected);

  return (
    <aside
      className={cn(
        'flex min-h-0 overflow-hidden',
        variant === 'panel' && 'flex-col rounded-2xl border border-border/60 bg-background',
        variant === 'plain' && 'h-[300px]',
        className,
      )}
    >
      {variant === 'panel' && title ? (
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted" />
            <span className="text-[13px] font-semibold text-foreground">{title}</span>
            <span className="text-[12px] text-text-muted">({titleCount ?? items.length})</span>
          </div>
        </div>
      ) : null}

      {showSidebarFilters ? (
        <div className="w-[72px] shrink-0 border-r border-slate-100 bg-slate-50 px-1.5 py-2">
          <div className="flex flex-col gap-0.5">
            {sidebarFilters.map((option) => {
              const isActive = activeSidebarFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSidebarFilterChange?.(option.value)}
                  onDoubleClick={() => onSidebarFilterDoubleClick?.(option.value)}
                  className={cn(
                    'w-full rounded-md border py-1.5 text-center text-[11px] font-bold transition-all duration-200 active:scale-95',
                    isActive
                      ? 'border-primary/15 bg-white text-primary shadow-sm'
                      : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-700',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
            {showSidebarReset ? (
              <button
                type="button"
                onClick={onSidebarReset}
                className="mt-auto w-full py-1.5 text-center text-[10px] font-bold text-slate-400 transition-colors duration-200 hover:text-primary"
              >
                重置
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {showControls ? (
          <div
            className={cn(
              variant === 'panel' ? 'border-b border-border/60 px-3 py-2.5' : 'border-b border-slate-100/80 px-3 py-2.5',
              controlsClassName,
            )}
          >
            <div className={cn('space-y-2', controlsInnerClassName)}>
              {showSegments ? (
                <SegmentedControl
                  options={segments}
                  value={activeSegment}
                  onChange={onSegmentChange}
                  size="sm"
                  className={cn('w-full [&>div]:grid [&>div]:w-full [&_button]:px-0', getSegmentGridClass(segments.length))}
                />
              ) : null}

              {showSearch || showSelectAll ? (
                <div className={cn(showSelectAll && 'flex items-center gap-2')}>
                  {showSearch ? (
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                      <Input
                        value={searchValue ?? ''}
                        onChange={(event) => onSearchChange?.(event.target.value)}
                        placeholder={searchPlaceholder}
                        className={cn(
                          'pl-9 pr-3 shadow-none',
                          variant === 'panel'
                            ? 'h-9 rounded-xl border-border/60 bg-background text-[12px] placeholder:text-text-muted/80'
                            : 'h-8 rounded-lg border-slate-200/60 bg-white text-[11px] focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-slate-300',
                        )}
                      />
                    </div>
                  ) : null}

                  {showSelectAll ? (
                    <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
                      <Checkbox
                        checked={resolvedIsAllSelected ? true : resolvedHasPartialSelection ? 'indeterminate' : false}
                        onCheckedChange={onToggleAll}
                        className="rounded-[3px]"
                      />
                      <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-slate-500">
                        {resolvedSelectedCount}/{items.length}
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            variant === 'panel'
              ? 'scrollbar-subtle min-h-0 max-h-[40rem] flex-1 overflow-y-auto p-2'
              : 'scrollbar-subtle flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2.5 py-2',
            listClassName,
          )}
          onWheel={variant === 'plain' ? (event) => event.stopPropagation() : undefined}
        >
          {isLoading ? (
            <div className={cn(variant === 'panel' ? 'flex items-center justify-center gap-2 py-9 text-[12px] text-text-muted' : 'py-6 text-center')}>
              <Loader2
                className={cn(
                  'animate-spin',
                  variant === 'panel' ? 'h-4 w-4' : 'mx-auto mb-1.5 h-4 w-4 text-slate-300',
                )}
              />
              <span className={variant === 'panel' ? undefined : 'text-[11px] text-slate-400'}>{loadingText}</span>
            </div>
          ) : items.length === 0 ? (
            variant === 'panel' ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[12px] text-text-muted">
                {emptyText}
              </div>
            ) : (
              <div className="py-6 text-center text-[11px] text-slate-400">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <Users className="h-4 w-4 text-slate-300" />
                </div>
                {emptyText}
              </div>
            )
          ) : (
            <div className={cn('space-y-0.5', itemsClassName)}>
              {items.map((item) => {
                const checked = selectedIds.includes(item.id);
                const disabled = item.disabled ?? false;
                const showCount = typeof item.count === 'number';

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      onBeforeSelect?.();
                      onSelect(item.id);
                    }}
                    className={cn(
                      'group flex w-full items-center gap-3 text-left transition-colors duration-150',
                      variant === 'panel' ? 'rounded-xl px-3 py-2.5' : 'rounded-lg border px-2.5 py-2',
                      checked ? 'border-primary/10 bg-primary/[0.06]' : '',
                      !checked && variant === 'panel' ? 'hover:bg-muted' : '',
                      !checked && variant === 'plain' ? 'border-transparent hover:border-slate-100 hover:bg-white hover:shadow-sm' : '',
                      disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : '',
                    )}
                  >
                    <UserAvatar
                      avatarKey={item.avatarKey}
                      name={item.name}
                      size={variant === 'panel' ? 'md' : 'sm'}
                      className={cn('shrink-0', variant === 'panel' && 'h-9 w-9')}
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate font-medium leading-tight',
                          variant === 'panel' ? 'text-[13px] text-foreground' : 'text-[12px]',
                          checked && variant === 'plain' ? 'text-primary' : '',
                        )}
                      >
                        {item.name}
                      </p>
                      <p
                        className={cn(
                          'truncate leading-tight',
                          variant === 'panel' ? 'text-[11px] text-text-muted' : 'text-[10px] text-slate-400',
                        )}
                      >
                        {item.meta ?? '未填写工号'}
                      </p>
                    </div>

                    {showCount ? (
                      <span className={cn('shrink-0 font-semibold tabular-nums', variant === 'panel' ? 'text-[14px] text-text-muted' : 'text-[12px] text-slate-500')}>
                        {item.count}
                      </span>
                    ) : null}

                    <div
                      aria-hidden="true"
                      className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-all duration-150',
                        selectionMode === 'single' ? 'rounded-full' : 'rounded-md',
                        checked
                          ? 'translate-x-0 border-primary bg-primary text-white opacity-100'
                          : 'translate-x-1 border-border bg-background opacity-0 group-hover:translate-x-0 group-hover:border-primary/40 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:border-primary/40 group-focus-visible:opacity-100',
                      )}
                    >
                      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
