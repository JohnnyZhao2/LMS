import { Check, Loader2, Users } from 'lucide-react';

import { UserAvatar } from '@/entities/user/components/user-avatar';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { cn } from '@/lib/utils';

export interface UserSelectPanelItem {
  id: number;
  name: string;
  avatarKey?: string | null;
  meta?: string | null;
  count?: number;
  disabled?: boolean;
}

interface UserSelectListProps {
  items: UserSelectPanelItem[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  onBeforeSelect?: () => void;
  selectionMode?: 'single' | 'multiple';
  appearance?: 'panel' | 'plain';
  layout?: 'list' | 'grid';
  density?: 'regular' | 'compact';
  emptyText?: string;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  listClassName?: string;
  itemsClassName?: string;
  showGridSelectionIndicator?: boolean;
}

function renderTrailing(
  item: UserSelectPanelItem,
  checked: boolean,
  selectionMode: 'single' | 'multiple',
) {
  const disabled = item.disabled ?? false;
  const hasCount = typeof item.count === 'number';

  if (hasCount) {
    return (
      <div className="relative flex h-[22px] w-8 shrink-0 items-center justify-end">
        <span
          className={cn(
            'absolute right-0 text-[14px] font-semibold tabular-nums text-text-muted transition-all duration-150',
            disabled
              ? 'opacity-100'
              : checked
                ? '-translate-x-1 opacity-0'
                : 'translate-x-0 opacity-100 group-hover:-translate-x-1 group-hover:opacity-0 group-focus-visible:-translate-x-1 group-focus-visible:opacity-0',
          )}
        >
          {item.count}
        </span>
        <div
          aria-hidden="true"
          className={cn(
            'absolute right-0 flex h-[18px] w-[18px] items-center justify-center border transition-all duration-150',
            selectionMode === 'single' ? 'rounded-full' : 'rounded-md',
            disabled
              ? 'opacity-0'
              : checked
                ? 'translate-x-0 border-primary bg-primary text-white opacity-100'
                : 'translate-x-1 border-border bg-background opacity-0 group-hover:translate-x-0 group-hover:border-primary/40 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:border-primary/40 group-focus-visible:opacity-100',
          )}
        >
          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-all duration-150',
        selectionMode === 'single' ? 'rounded-full' : 'rounded-md',
        disabled
          ? 'opacity-0'
          : checked
            ? 'translate-x-0 border-primary bg-primary text-white opacity-100'
            : 'translate-x-1 border-border bg-background opacity-0 group-hover:translate-x-0 group-hover:border-primary/40 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:border-primary/40 group-focus-visible:opacity-100',
      )}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </div>
  );
}

export function UserSelectList({
  items,
  selectedIds,
  onSelect,
  onBeforeSelect,
  selectionMode = 'multiple',
  appearance = 'plain',
  layout = 'list',
  density = 'regular',
  emptyText = '暂无成员',
  isLoading = false,
  loadingText = '加载中...',
  className,
  listClassName,
  itemsClassName,
  showGridSelectionIndicator = true,
}: UserSelectListProps) {
  return (
    <ScrollContainer
      scrollbar="inherit"
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain',
        appearance === 'panel'
          ? layout === 'grid'
            ? 'px-0 py-0'
            : density === 'compact'
              ? 'p-1.5'
              : 'p-2'
          : 'overscroll-contain px-2.5 py-2',
        className,
      )}
      onWheel={(event) => event.stopPropagation()}
    >
      {isLoading ? (
        appearance === 'panel' ? (
          <div className="flex items-center justify-center gap-2 py-9 text-[12px] text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto mb-1.5 h-4 w-4 animate-spin text-slate-300" />
            <span className="text-[11px] text-slate-400">{loadingText}</span>
          </div>
        )
      ) : items.length === 0 ? (
        appearance === 'panel' ? (
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
        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-2 gap-2'
              : 'space-y-0.5',
            itemsClassName,
            listClassName,
          )}
        >
          {items.map((item) => {
            const checked = selectedIds.includes(item.id);
            const disabled = item.disabled ?? false;

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
                  'group relative flex w-full items-center text-left transition-all duration-150',
                  layout === 'grid'
                    ? density === 'compact'
                      ? 'min-h-[56px] rounded-lg border border-border/70 px-2.5 py-2'
                      : 'min-h-[68px] rounded-xl border border-border/70 px-3 py-2.5'
                    : appearance === 'panel'
                      ? density === 'compact'
                        ? 'gap-2.5 rounded-md px-2.5 py-1.5'
                        : 'gap-3 rounded-lg px-3 py-2.5'
                      : 'rounded-lg border px-2.5 py-2',
                  appearance === 'panel'
                    ? layout === 'grid'
                      ? (
                        checked
                          ? 'border-primary/25 bg-primary-50/35'
                          : 'bg-background hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted/20'
                      )
                      : (checked ? 'bg-primary-50/70' : 'hover:bg-muted')
                    : (
                      checked
                        ? 'border-primary/10 bg-primary/[0.06]'
                        : 'border-transparent hover:border-slate-100 hover:bg-white hover:shadow-sm'
                    ),
                  disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : '',
                )}
              >
                {layout === 'grid' ? (
                  <>
                    <UserAvatar
                      avatarKey={item.avatarKey}
                      name={item.name}
                      size="sm"
                      className={cn(
                        'mt-0.5 shrink-0 ring-1 ring-border/60',
                        density === 'compact' ? 'h-7 w-7' : 'h-8 w-8',
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'truncate font-semibold leading-tight text-foreground',
                        density === 'compact' ? 'text-[12px]' : 'text-[12px]',
                      )}>
                        {item.name}
                      </p>
                      <p className={cn(
                        'mt-0.5 truncate leading-tight text-text-muted',
                        density === 'compact' ? 'text-[10px]' : 'text-[10px]',
                      )}>
                        {item.meta ?? '未填写工号'}
                      </p>
                    </div>

                    {showGridSelectionIndicator ? (
                      <div
                        aria-hidden="true"
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-150',
                          disabled
                            ? 'opacity-0'
                            : checked
                              ? 'border-primary bg-primary text-white opacity-100'
                              : 'border-border bg-background text-transparent opacity-70 group-hover:border-primary/40 group-hover:bg-primary-50/80 group-hover:text-primary',
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <UserAvatar
                      avatarKey={item.avatarKey}
                      name={item.name}
                      size={appearance === 'panel' ? (density === 'compact' ? 'sm' : 'md') : 'sm'}
                      className={cn(
                        'shrink-0',
                        appearance === 'panel' && (density === 'compact' ? 'h-8 w-8' : 'h-9 w-9'),
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate font-medium leading-tight',
                          appearance === 'panel'
                            ? density === 'compact'
                              ? 'text-[12px] text-foreground'
                              : 'text-[13px] text-foreground'
                            : 'text-[12px]',
                          checked && appearance === 'plain' ? 'text-primary' : '',
                        )}
                      >
                        {item.name}
                      </p>
                      <p
                        className={cn(
                          'truncate leading-tight',
                          appearance === 'panel'
                            ? density === 'compact'
                              ? 'text-[10px] text-text-muted'
                              : 'text-[11px] text-text-muted'
                            : 'text-[10px] text-slate-400',
                        )}
                      >
                        {item.meta ?? '未填写工号'}
                      </p>
                    </div>

                    {renderTrailing(item, checked, selectionMode)}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </ScrollContainer>
  );
}
