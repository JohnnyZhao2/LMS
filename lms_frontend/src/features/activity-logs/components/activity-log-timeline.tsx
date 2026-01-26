import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-6">
      {groupedItems.map((group) => (
        <div key={group.dateKey} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{getDateLabel(group.dateKey)}</span>
            <Badge variant="secondary">{group.items.length}</Badge>
          </div>
          <div className="space-y-4">
            {group.items.map((item) => {
              return (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="w-16 pt-1 text-xs font-semibold text-text-muted">
                    {getTimeLabel(item.createdAt)}
                  </div>
                  <div
                    className={cn(
                      'relative flex-1 rounded-lg border border-border bg-background p-4'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.icon ? (
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
                            {item.icon}
                          </span>
                        ) : null}
                        <div className="space-y-1">
                          <div className="text-sm leading-tight text-foreground">{item.title}</div>
                          <div
                            className={cn(
                              'rounded-md bg-muted px-2.5 py-1.5 text-xs leading-tight',
                              getDescriptionClass(item.status)
                            )}
                          >
                            {item.description || '无详细描述'}
                          </div>
                          {item.meta ? (
                            <div className="text-xs text-text-muted">{item.meta}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
