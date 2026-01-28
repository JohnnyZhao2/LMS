import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActivityLogStatus = 'success' | 'failed' | 'partial';

export interface ActivityLogTimelineItem {
  id: string;
  createdAt: string;
  status: ActivityLogStatus;
  title: React.ReactNode;
  meta?: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
}

interface ActivityLogTimelineProps {
  items: ActivityLogTimelineItem[];
  isLoading?: boolean;
  emptyText?: string;
}

const getDescriptionClass = (status: ActivityLogStatus) => {
  if (status === 'failed') {
    return 'text-error-500';
  }
  if (status === 'partial') {
    return 'text-warning-700';
  }
  return 'text-text-muted';
};

const getDateKeyFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateKey = (dateString: string) => {
  return getDateKeyFromDate(new Date(dateString));
};

const getDateLabel = (dateKey: string) => {
  const todayKey = getDateKeyFromDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKeyFromDate(yesterday);
  if (dateKey === todayKey) return '今天';
  if (dateKey === yesterdayKey) return '昨天';
  return dateKey;
};

const getTimeLabel = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const groupItemsByDate = (items: ActivityLogTimelineItem[]) => {
  const grouped = new Map<string, ActivityLogTimelineItem[]>();
  items.forEach((item) => {
    const key = getDateKey(item.createdAt);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(item);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateKey, dateItems]) => ({ dateKey, items: dateItems }));
};

export const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({
  items,
  isLoading = false,
  emptyText = '暂无日志',
}) => {
  const groupedItems = useMemo(() => groupItemsByDate(items), [items]);

  if (isLoading) {
    return <div className="text-sm text-text-muted">正在加载日志...</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-text-muted">{emptyText}</div>;
  }

  return (
    <div className="space-y-8">
      {groupedItems.map((group) => (
        <div key={group.dateKey} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-bold text-foreground/80">{getDateLabel(group.dateKey)}</span>
            <span className="text-[10px] font-medium text-text-muted bg-muted px-1.5 py-0.5 rounded-full">
              {group.items.length}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm shadow-black/5">
            <div className="divide-y divide-border/40">
              {group.items.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="group relative flex items-start gap-3 p-3 transition-colors hover:bg-muted/30"
                  >
                    {/* Time Column */}
                    <div className="w-12 shrink-0 pt-1 text-[11px] font-medium text-text-muted/70 tabular-nums">
                      {getTimeLabel(item.createdAt)}
                    </div>

                    {/* Icon Column */}
                    <div className="shrink-0 pt-0.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-foreground/70 ring-1 ring-border/5 group-hover:bg-background group-hover:shadow-sm transition-all text-xs">
                        {item.icon ? (
                          <span className="transition-transform group-hover:scale-110">
                            {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                          </span>
                        ) : (
                          <Activity size={14} />
                        )}
                      </div>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-medium text-foreground truncate">
                          {item.title}
                        </div>
                        {item.meta && (
                          <div className="shrink-0 text-[10px] text-text-muted">
                            {item.meta}
                          </div>
                        )}
                      </div>

                      <div className={cn(
                        "text-[12px] leading-relaxed break-words opacity-90",
                        getDescriptionClass(item.status)
                      )}>
                        {item.description || "无详细描述"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
