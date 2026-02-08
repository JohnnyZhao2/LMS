import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimelineIconProps = {
  size?: number;
  strokeWidth?: number;
};

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
    <div className="space-y-6 px-1 pb-6 relative z-10">
      {groupedItems.map((group, groupIdx) => (
        <div
          key={group.dateKey}
          className={cn(
            "space-y-2 animate-in fade-in slide-in-from-left-4 duration-700",
            `stagger-delay-${(groupIdx % 5) + 1}`
          )}
        >
          {/* Subtle Condensed Date Header */}
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
              {getDateLabel(group.dateKey)}
            </span>
            <div className="h-px flex-1 bg-border/20" />
            <span className="text-[9px] font-bold text-muted-foreground/30 tabular-nums uppercase tracking-tighter">
              Batch: {group.items.length}
            </span>
          </div>

          <div className="space-y-0.5">
            {group.items.map((item) => {
              // Status-based stylistic DNA
              const isError = item.status === 'failed';
              const isWarning = item.status === 'partial';

              const statusColors = {
                success: {
                  bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
                  title: 'text-foreground group-hover/item:text-primary',
                  indicator: 'bg-emerald-500'
                },
                failed: {
                  bg: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
                  title: 'text-rose-600 dark:text-rose-400',
                  indicator: 'bg-rose-500'
                },
                partial: {
                  bg: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
                  title: 'text-amber-600 dark:text-amber-400',
                  indicator: 'bg-amber-500'
                }
              };

              const current = statusColors[item.status] || statusColors.success;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group/item relative flex items-center gap-4 py-2.5 px-4 rounded-2xl transition-all duration-300 border border-transparent hover:border-border/40",
                    isError
                      ? "bg-rose-50/20 dark:bg-rose-500/5 hover:bg-rose-50/40"
                      : (isWarning ? "bg-amber-50/20 dark:bg-amber-500/5 hover:bg-amber-50/40" : "hover:bg-white/40 hover:backdrop-blur-md hover:shadow-sm")
                  )}
                >
                  {/* 1. Status Beam - Sharper architectural detail */}
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full transition-all duration-500",
                    isError || isWarning ? "h-6 opacity-100" : "h-3 opacity-20 group-hover/item:h-8 group-hover/item:opacity-100",
                    isError ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                      isWarning ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                        "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                  )} />


                  {/* 3. Machined Icon Container */}
                  <div className="shrink-0 z-10">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 border",
                      "bg-muted/10 border-border/10",
                      current.bg,
                      isError && "animate-[pulse_2s_infinite]"
                    )}>
                      {React.isValidElement(item.icon) ? (
                        React.cloneElement(item.icon as React.ReactElement<TimelineIconProps>, {
                          size: 15,
                          strokeWidth: 2.5,
                        })
                      ) : (
                        <Activity size={15} strokeWidth={2.5} />
                      )}
                    </div>
                  </div>

                  {/* 4. High-Density Content Hub */}
                  <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "text-[13px] font-bold tracking-tight leading-tight truncate transition-colors",
                        isError ? "text-rose-600 dark:text-rose-400" :
                          isWarning ? "text-amber-600 dark:text-amber-400" :
                            "text-slate-800 dark:text-slate-200 group-hover/item:text-primary"
                      )}>
                        {item.title}
                      </div>
                      {item.meta && (
                        <div className="shrink-0 text-[8px] font-black text-slate-500/40 dark:text-slate-400/40 uppercase tracking-[0.15em] bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded leading-none">
                          {item.meta}
                        </div>
                      )}
                    </div>
                    {/* Description: Distinctive color, not just reduced opacity */}
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate tracking-tight transition-colors group-hover/item:text-slate-600 dark:group-hover/item:text-slate-300">
                      {item.description || "System operation event"}
                    </div>
                  </div>

                  {/* 5. Right-side Status & Time */}
                  <div className="flex items-center gap-4 shrink-0 z-10 ml-auto">
                    {(isError || isWarning) && (
                      <div className={cn(
                        "px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-[0.2em] border transition-all duration-300 cursor-default",
                        isError ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        "group-hover/item:bg-background group-hover/item:border-current/40 shadow-sm"
                      )}>
                        {item.status}
                      </div>
                    )}

                    <div className="text-[10px] font-bold text-muted-foreground/20 tabular-nums text-right min-w-[40px] tracking-tighter">
                      {getTimeLabel(item.createdAt)}
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
