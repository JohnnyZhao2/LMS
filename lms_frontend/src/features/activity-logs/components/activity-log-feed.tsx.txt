import { Checkbox } from '@/components/ui/checkbox';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { UserAvatar } from '@/components/common/user-avatar';
import { cn } from '@/lib/utils';
import type { ActivityLogItem } from '../types';

interface ActivityLogFeedProps {
  items: ActivityLogItem[];
  isLoading?: boolean;
  selectedLogIds?: string[];
  selectionDisabled?: boolean;
  onToggleSelect?: (itemId: string) => void;
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

const formatDayLabel = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return '今天';
  if (date.toDateString() === yesterday.toDateString()) return '昨天';

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const groupItemsByDay = (items: ActivityLogItem[]) => {
  const groups = new Map<string, ActivityLogItem[]>();
  for (const item of items) {
    const key = formatDayLabel(item.created_at);
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }
  return Array.from(groups.entries()).map(([label, groupItems]) => ({ label, items: groupItems }));
};

const LoadingState = () => (
  <ScrollContainer className="h-full overflow-y-auto px-5 py-4">
    <div className="relative ml-[18px] border-l-2 border-border/40 pl-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 py-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-56 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  </ScrollContainer>
);

export const ActivityLogFeed: React.FC<ActivityLogFeedProps> = ({
  items,
  isLoading = false,
  selectedLogIds = [],
  selectionDisabled = false,
  onToggleSelect,
}) => {
  if (isLoading) return <LoadingState />;

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-5 py-16 text-center">
        <p className="text-[13px] text-text-muted">暂无命中日志</p>
      </div>
    );
  }

  const groups = groupItemsByDay(items);

  return (
    <ScrollContainer className="h-full overflow-y-auto px-5 py-4">
      <div className="relative ml-[18px]">
        <div className="absolute bottom-0 left-0 top-0 w-px bg-border/60" />

        {groups.map((group) => (
          <div key={group.label}>
            <div className="relative flex items-center pb-1 pt-1">
              <div className="absolute -left-[5px] flex h-[10px] w-[10px] items-center justify-center rounded-full border-2 border-primary bg-background" />
              <span className="pl-7 text-[13px] font-semibold text-foreground">{group.label}</span>
            </div>

            {group.items.map((item) => {
              const isFailed = item.status === 'failed' || item.status === 'partial';
              return (
                <div key={item.id} className="relative">
                  <div className="absolute -left-[3px] top-[18px] h-1.5 w-1.5 rounded-full bg-border" />

                  <div
                    className={cn(
                      'group ml-5 flex gap-3 rounded-lg py-2.5 pl-2 pr-2 transition-colors hover:bg-muted',
                    )}
                  >
                    <UserAvatar
                      avatarKey={item.actor?.avatar_key}
                      name={item.actor?.username ?? ''}
                      size="md"
                      className="mt-0.5 h-9 w-9 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-6">
                        <span className="text-foreground">{item.summary}</span>
                        {isFailed && (
                          <span className={cn(
                            'rounded-full px-2 py-px text-[11px] font-medium',
                            item.status === 'failed'
                              ? 'bg-error-50 text-destructive'
                              : 'bg-warning-50 text-warning-700'
                          )}>
                            {item.status === 'failed' ? '失败' : '部分成功'}
                          </span>
                        )}
                        <span className="text-[12px] text-text-muted/60">· {formatTime(item.created_at)}</span>
                      </div>

                      {item.description && (
                        <div className="mt-1.5 rounded-xl border border-border/50 bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground/80">
                          {item.description}
                        </div>
                      )}
                    </div>

                    {onToggleSelect ? (
                      <Checkbox
                        checked={selectedLogIds.includes(item.id)}
                        onCheckedChange={() => onToggleSelect(item.id)}
                        disabled={selectionDisabled}
                        aria-label={`选择日志 ${item.id}`}
                        className={cn(
                          'mt-2.5 shrink-0 transition-opacity',
                          selectedLogIds.includes(item.id)
                            ? 'opacity-100'
                            : 'opacity-70 md:opacity-0 md:group-hover:opacity-100'
                        )}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ScrollContainer>
  );
};
