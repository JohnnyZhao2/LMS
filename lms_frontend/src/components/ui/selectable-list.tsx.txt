import { Loader2, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { cn } from '@/lib/utils';

export interface SelectableListIndicator {
  value: number;
  label: string;
  tone: 'neutral' | 'primary' | 'destructive';
}

export interface SelectableListItem {
  id: number;
  name: string;
  meta?: string | null;
  indicators?: SelectableListIndicator[];
  disabled?: boolean;
}

interface SelectableListBaseProps {
  items: SelectableListItem[];
  layout?: 'list' | 'grid';
  className?: string;
  listClassName?: string;
  itemsClassName?: string;
  emptyText?: string;
  isLoading?: boolean;
  loadingText?: string;
  renderLeading?: (
    item: SelectableListItem,
    options: { layout: 'list' | 'grid' },
  ) => ReactNode;
  emptyMetaText?: string;
}

type SelectableListProps = SelectableListBaseProps &
  (
    | {
        mode: 'inspect';
        activeId: number | null;
        checkedIds: number[];
        onActivate: (id: number | null) => void;
        onToggleCheck: (id: number) => void;
      }
    | {
        mode: 'select';
        selectedIds: number[];
        onToggle: (id: number) => void;
      }
  );

function Indicator({ value, label, tone }: SelectableListIndicator) {
  if (value <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold tabular-nums',
        tone === 'primary' && 'bg-primary-100/70 text-primary-700',
        tone === 'destructive' && 'bg-destructive-500 text-white',
        tone === 'neutral' && 'bg-muted text-text-muted',
      )}
      aria-label={`${value} 项${label}`}
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

function SelectionControl({
  item,
  checked,
  disabled,
  onToggleCheck,
}: {
  item: SelectableListItem;
  checked: boolean;
  disabled: boolean;
  onToggleCheck: (id: number) => void;
}) {
  const indicators =
    item.indicators?.filter((indicator) => indicator.value > 0) ?? [];

  return (
    <div className="group/control relative flex h-5 min-w-5 shrink-0 items-center justify-end">
      <div
        className={cn(
          'flex items-center gap-1 transition-all duration-150',
          checked
            ? 'translate-x-1 opacity-0'
            : 'translate-x-0 opacity-100 group-focus-within/control:translate-x-1 group-focus-within/control:opacity-0 group-hover/control:translate-x-1 group-hover/control:opacity-0',
        )}
      >
        {indicators.map((indicator) => (
          <Indicator
            key={`${indicator.label}:${indicator.tone}`}
            {...indicator}
          />
        ))}
      </div>

      <Checkbox
        checked={checked}
        disabled={disabled}
        aria-label={checked ? `取消勾选 ${item.name}` : `勾选 ${item.name}`}
        onCheckedChange={() => onToggleCheck(item.id)}
        className={cn(
          'absolute right-0 transition-all duration-150',
          checked
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-1 opacity-0 group-focus-within/control:pointer-events-auto group-focus-within/control:translate-x-0 group-focus-within/control:opacity-100 group-hover/control:pointer-events-auto group-hover/control:translate-x-0 group-hover/control:opacity-100',
        )}
      />
    </div>
  );
}

export function SelectableList(props: SelectableListProps) {
  const {
    items,
    layout = 'list',
    emptyText = '暂无数据',
    isLoading = false,
    loadingText = '加载中...',
    renderLeading,
    emptyMetaText = '',
    className,
    listClassName,
    itemsClassName,
  } = props;

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
        <div className="text-text-muted flex items-center justify-center gap-2 py-9 text-[12px]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="border-border text-text-muted rounded-xl border border-dashed px-4 py-10 text-center text-[12px]">
          <Users className="mx-auto mb-2 h-4 w-4 opacity-40" />
          {emptyText}
        </div>
      ) : (
        <div
          data-layout={layout}
          className={cn(
            layout === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1',
            itemsClassName,
            listClassName,
          )}
        >
          {items.map((item) => {
            const active =
              props.mode === 'inspect'
                ? props.activeId === item.id
                : props.selectedIds.includes(item.id);
            const disabled = item.disabled ?? false;

            return (
              <div
                key={item.id}
                className={cn(
                  'group flex w-full items-center text-left transition-all duration-150',
                  layout === 'grid'
                    ? 'border-border/70 bg-background min-h-[56px] rounded-lg border px-2.5 py-2'
                    : 'min-h-[56px] gap-3 rounded-lg px-3 py-2.5',
                  active
                    ? layout === 'grid'
                      ? 'border-primary/25 bg-primary-50/35'
                      : 'bg-primary-50/70'
                    : layout === 'grid'
                      ? 'hover:border-primary/20 hover:bg-muted/20 hover:-translate-y-0.5'
                      : 'hover:bg-muted',
                  disabled &&
                    'cursor-not-allowed opacity-45 hover:bg-transparent',
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => {
                    if (props.mode === 'inspect') {
                      props.onActivate(active ? null : item.id);
                      return;
                    }
                    props.onToggle(item.id);
                  }}
                  className={cn(
                    'focus-visible:ring-primary/30 flex min-w-0 flex-1 items-center self-stretch rounded-[inherit] text-left focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed',
                    layout === 'grid' ? 'gap-[5px]' : 'gap-3',
                  )}
                >
                  {renderLeading?.(item, { layout })}

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'text-foreground block truncate leading-tight',
                        layout === 'grid'
                          ? 'text-[12px] font-semibold'
                          : 'text-[13px] font-medium',
                      )}
                    >
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        'text-text-muted block truncate leading-tight',
                        layout === 'grid'
                          ? 'mt-px text-[10px]'
                          : 'mt-0.5 text-[11px]',
                      )}
                    >
                      {item.meta ?? emptyMetaText}
                    </span>
                  </span>
                </button>

                {props.mode === 'inspect' ? (
                  <SelectionControl
                    item={item}
                    checked={props.checkedIds.includes(item.id)}
                    disabled={disabled}
                    onToggleCheck={props.onToggleCheck}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </ScrollContainer>
  );
}
