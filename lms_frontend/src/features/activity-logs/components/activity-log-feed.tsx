import { cn } from '@/lib/utils';
import type { ActivityLogItem } from '../types';

interface ActivityLogFeedProps {
  items: ActivityLogItem[];
  isLoading?: boolean;
}

const STATUS_LABELS = {
  success: '成功',
  failed: '失败',
  partial: '部分成功',
} as const;

const STATUS_STYLES = {
  success: 'bg-secondary-50 text-secondary-700',
  failed: 'bg-error-50 text-destructive',
  partial: 'bg-warning-50 text-warning-700',
} as const;

const TARGET_TYPE_LABELS: Record<string, string> = {
  knowledge: '知识',
  quiz: '试卷',
  question: '题目',
  assignment: '作业',
  task_management: '任务',
  grading: '批改',
  spot_check: '抽查',
  data_export: '导出',
  submission: '答题',
  learning: '学习',
};

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-600',
  'bg-secondary-100 text-secondary-600',
  'bg-warning-100 text-warning-700',
  'bg-destructive-100 text-destructive-600',
  'bg-primary-200 text-primary-700',
  'bg-secondary-200 text-secondary-700',
];

const getAvatarColor = (id: number | undefined) =>
  AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length];

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

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

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
  <div className="px-5 py-4">
    <div className="relative ml-[18px] border-l-2 border-border/40 pl-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 py-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-56 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ActivityLogFeed: React.FC<ActivityLogFeedProps> = ({ items, isLoading = false }) => {
  if (isLoading) return <LoadingState />;

  if (items.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-[13px] text-text-muted">暂无命中日志</p>
      </div>
    );
  }

  const groups = groupItemsByDay(items);

  return (
    <div className="px-5 py-4">
      {/* 时间线容器：左侧竖线贯穿 */}
      <div className="relative ml-[18px]">
        {/* 贯穿竖线 */}
        <div className="absolute bottom-0 left-0 top-0 w-px bg-border/60" />

        {groups.map((group, gi) => (
          <div key={group.label}>
            {/* 日期节点 */}
            <div className="relative flex items-center pb-1 pt-1">
              {/* 节点圆点 - 大号，覆盖竖线 */}
              <div className="absolute -left-[5px] flex h-[10px] w-[10px] items-center justify-center rounded-full border-2 border-primary bg-background" />
              <span className="pl-7 text-[13px] font-semibold text-foreground">{group.label}</span>
            </div>

            {/* 该日期下的日志条目 */}
            {group.items.map((item, ii) => {
              const isLast = gi === groups.length - 1 && ii === group.items.length - 1;
              return (
                <div key={item.id} className="relative">
                  {/* 节点小圆点 */}
                  <div className="absolute -left-[3px] top-[18px] h-1.5 w-1.5 rounded-full bg-border" />

                  {/* 内容区 */}
                  <div
                    className={cn(
                      'ml-5 flex gap-3 rounded-xl py-2.5 pl-2 pr-2 transition-colors hover:bg-muted/30',
                      isLast && 'mb-0'
                    )}
                  >
                    {/* 头像 */}
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                        getAvatarColor(item.actor?.id)
                      )}
                    >
                      {item.actor?.username.slice(0, 1) ?? '?'}
                    </div>

                    {/* 文字内容 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-6">
                        <span className="font-semibold text-foreground">
                          {item.actor?.username ?? '系统'}
                        </span>
                        <span className="text-text-muted">{item.action}</span>
                        {item.target && (
                          <>
                            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-px text-[12px] font-medium text-foreground">
                              #{item.target.title}
                            </span>
                            <span className="text-[12px] text-text-muted">
                              {TARGET_TYPE_LABELS[item.target.type] ?? item.target.type}
                            </span>
                          </>
                        )}
                        <span
                          className={cn(
                            'ml-0.5 rounded-full px-2 py-px text-[11px] font-medium',
                            STATUS_STYLES[item.status]
                          )}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>

                      <div className="mt-0.5 text-[12px] text-text-muted">
                        {formatTime(item.created_at)}
                        {item.description && (
                          <span className="ml-2 text-text-muted/70">· {item.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
