import { Check, Loader2 } from 'lucide-react';

import { UserAvatar } from '@/components/users/user-avatar';
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
  /**
   * 双态选择：点行 = onSelect（查看），点勾 = onToggleCheck（多选）。
   * 传入后勾选态用 checkedIds，行高亮用 selectedIds。
   */
  checkedIds?: number[];
  onToggleCheck?: (id: number) => void;
  layout?: 'list' | 'grid';
  emptyText?: string;
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  listClassName?: string;
  itemsClassName?: string;
}

function renderCheckVisual(
  checked: boolean,
  disabled: boolean,
  options?: {
    dualSelect?: boolean;
    className?: string;
    ariaHidden?: boolean;
  },
) {
  return (
    <div
      aria-hidden={options?.ariaHidden}
      className={cn(
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-all duration-150',
        disabled
          ? 'opacity-0'
          : checked
            ? 'translate-x-0 border-primary bg-primary text-white opacity-100'
            : options?.dualSelect
              ? 'border-border/80 bg-background opacity-100'
              : 'translate-x-1 border-border bg-background opacity-0 group-hover:translate-x-0 group-hover:border-primary/40 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:border-primary/40 group-focus-visible:opacity-100',
        options?.className,
      )}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </div>
  );
}

function renderTrailing(
  item: UserSelectPanelItem,
  checked: boolean,
  options?: {
    dualSelect?: boolean;
    onToggleCheck?: (id: number) => void;
  },
) {
  const disabled = item.disabled ?? false;
  const hasCount = typeof item.count === 'number';
  const dualSelect = options?.dualSelect === true;

  if (hasCount && !dualSelect) {
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
        {renderCheckVisual(checked, disabled, {
          className: 'absolute right-0',
          ariaHidden: true,
        })}
      </div>
    );
  }

  const checkVisual = renderCheckVisual(checked, disabled, { dualSelect });

  if (dualSelect && !disabled) {
    return (
      <button
        type="button"
        aria-label={checked ? `取消勾选 ${item.name}` : `勾选 ${item.name}`}
        aria-pressed={checked}
        className="flex shrink-0 items-center justify-center rounded-md p-1 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={(event) => {
          event.stopPropagation();
          options?.onToggleCheck?.(item.id);
        }}
      >
        {checkVisual}
      </button>
    );
  }

  return checkVisual;
}

export function UserSelectList({
  items,
  selectedIds,
  onSelect,
  checkedIds,
  onToggleCheck,
  layout = 'list',
  emptyText = '暂无成员',
  isLoading = false,
  loadingText = '加载中...',
  className,
  listClassName,
  itemsClassName,
}: UserSelectListProps) {
  const dualSelect = typeof onToggleCheck === 'function';

  return (
    <ScrollContainer
      scrollbar="subtle"
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain',
        layout === 'grid' ? 'px-0 py-0' : 'p-2',
        className,
      )}
      onWheel={(event) => event.stopPropagation()}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-9 text-[12px] text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : items.length === 0 ? (
        <div className={listClassName}>
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[12px] text-text-muted">
            {emptyText}
          </div>
        </div>
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
            const active = selectedIds.includes(item.id);
            const checked = dualSelect
              ? (checkedIds ?? []).includes(item.id)
              : selectedIds.includes(item.id);
            const disabled = item.disabled ?? false;
            const handleSelect = () => {
              if (disabled) {
                return;
              }
              onSelect(item.id);
            };
            const rowClassName = cn(
              'group relative flex w-full text-left transition-all duration-150',
              layout === 'grid'
                ? 'flex-col rounded-xl border border-border/70 px-3.5 py-3'
                : 'items-center gap-3 rounded-lg px-3 py-2.5',
              layout === 'grid'
                ? (
                  active
                    ? 'border-primary/25 bg-primary-50/35'
                    : 'bg-background hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted/20'
                )
                : (active ? 'bg-primary-50/70' : 'hover:bg-muted'),
              disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : '',
            );

            const listItemContent = (
              <>
                <UserAvatar
                  avatarKey={item.avatarKey}
                  name={item.name}
                  size="md"
                  className="h-9 w-9 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                    {item.name}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-text-muted">
                    {item.meta ?? '未填写工号'}
                  </p>
                </div>
              </>
            );

            const trailing = layout !== 'grid'
              ? renderTrailing(item, checked, {
                dualSelect,
                onToggleCheck,
              })
              : null;

            if (dualSelect && layout !== 'grid') {
              return (
                <div key={item.id} className={rowClassName}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={handleSelect}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    {listItemContent}
                  </button>
                  {trailing}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={handleSelect}
                className={rowClassName}
              >
                {layout === 'grid' ? (
                  <div className="flex w-full items-center gap-2.5">
                    <UserAvatar
                      avatarKey={item.avatarKey}
                      name={item.name}
                      size="sm"
                      className="h-8 w-8 shrink-0 ring-1 ring-border/60"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                        {item.name}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-medium leading-tight text-text-muted">
                        {item.meta || '未填写工号'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {listItemContent}
                    {trailing}
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
