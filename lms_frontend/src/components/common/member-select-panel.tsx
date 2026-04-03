import { Check, Loader2, Search, Users } from 'lucide-react';

import { UserAvatar } from '@/components/common/user-avatar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MemberSelectPanelItem {
  id: number;
  name: string;
  employeeId?: string | null;
  avatarKey?: string | null;
  meta?: string | null;
  count?: number;
  disabled?: boolean;
}

export interface MemberSelectPanelSegment {
  label: string;
  value: string;
}

interface MemberSelectPanelProps {
  title?: string;
  items: MemberSelectPanelItem[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  selectionMode?: 'single' | 'multiple';
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
  segments?: MemberSelectPanelSegment[];
  activeSegment?: string;
  onSegmentChange?: (value: string) => void;
}

export const MemberSelectPanel: React.FC<MemberSelectPanelProps> = ({
  title = '成员',
  items,
  selectedIds,
  onSelect,
  selectionMode = 'multiple',
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
}) => {
  const showSearch = typeof onSearchChange === 'function';
  const showSegments = segments.length > 0 && typeof onSegmentChange === 'function' && typeof activeSegment === 'string';
  const showControls = showSegments || showSearch;
  const segmentGridClass =
    segments.length === 2
      ? '[&>div]:grid-cols-2'
      : segments.length === 3
        ? '[&>div]:grid-cols-3'
        : segments.length === 4
          ? '[&>div]:grid-cols-4'
          : '';

  return (
    <aside className={cn('flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background', className)}>
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
          <span className="text-[12px] text-text-muted">({items.length})</span>
        </div>
      </div>

      {showControls ? (
        <div className={cn('border-b border-border/60 px-3 py-2.5', controlsClassName)}>
          <div className={cn('space-y-2', controlsInnerClassName)}>
            {showSegments ? (
              <SegmentedControl
                options={segments}
                value={activeSegment}
                onChange={onSegmentChange}
                size="sm"
                className={cn('w-full [&>div]:w-full [&>div]:grid [&_button]:px-0', segmentGridClass)}
              />
            ) : null}

            {showSearch ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <Input
                  value={searchValue ?? ''}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 rounded-xl border-border/60 bg-background pl-9 pr-3 text-[12px] shadow-none placeholder:text-text-muted/80"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn('scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-2 max-h-[40rem]', listClassName)}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-9 text-[12px] text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[12px] text-text-muted">
            {emptyText}
          </div>
        ) : (
          <div className={cn('space-y-0.5', itemsClassName)}>
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);
              const disabled = item.disabled ?? false;
              const subText = item.meta ?? item.employeeId ?? '未填写工号';

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    onSelect(item.id);
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150',
                    checked ? 'bg-primary-50/70' : 'hover:bg-muted',
                    disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : '',
                  )}
                >
                  <UserAvatar
                    avatarKey={item.avatarKey}
                    name={item.name}
                    size="md"
                    className="h-9 w-9 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight text-foreground">{item.name}</p>
                    <p className="truncate text-[11px] leading-tight text-text-muted">{subText}</p>
                  </div>

                  {typeof item.count === 'number' ? (
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-text-muted">
                      {item.count}
                    </span>
                  ) : null}

                  <div
                    aria-hidden="true"
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-all duration-150',
                      selectionMode === 'single' ? 'rounded-full' : 'rounded-md',
                      checked
                        ? 'border-primary bg-primary text-white opacity-100 translate-x-0'
                        : 'border-border bg-background opacity-0 translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-hover:border-primary/40 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:border-primary/40',
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
    </aside>
  );
};
