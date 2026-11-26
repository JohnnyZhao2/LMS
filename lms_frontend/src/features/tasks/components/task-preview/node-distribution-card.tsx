import * as React from 'react';
import { Card } from '@/components/ui/card';
import { IconBox } from '@/components/common/icon-box';
import { formatDurationClock } from '@/lib/date-time';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { DistributionItem, TaskNodeProgress } from '@/types/task-analytics';
import { NODE_CATEGORY_META } from './node-category-meta';
import { OverviewRing } from './task-overview-strip';

interface SummaryMetricItem {
  label: string;
  value: string;
  unit?: string;
  ringPercent?: number;
  ringColor?: string;
}

const PANEL_CLASS = 'rounded-xl bg-muted/35 px-6 py-5';

export const NodeDistributionCard: React.FC<{
  selectedNode: TaskNodeProgress | null;
}> = ({ selectedNode }) => {
  if (!selectedNode) {
    return (
      <Card className="flex h-40 items-center justify-center border border-border/70 p-4 text-sm text-text-muted">
        暂无任务节点数据
      </Card>
    );
  }

  const meta = NODE_CATEGORY_META[selectedNode.category];
  const isKnowledge = selectedNode.category === 'KNOWLEDGE';
  const isExam = selectedNode.category === 'EXAM';
  const completionPercent = Math.round(selectedNode.percentage);

  const metaParts = [
    meta.label,
    selectedNode.total_score !== null && `总分 ${formatScore(selectedNode.total_score)} 分`,
    selectedNode.pass_score !== null && `及格 ${formatScore(selectedNode.pass_score)} 分`,
    selectedNode.duration !== null && `参考 ${selectedNode.duration} 分钟`,
  ].filter(Boolean) as string[];

  return (
    <Card className="border border-border/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <IconBox icon={meta.icon} size="sm" bgColor={meta.bgClass} iconColor={meta.textClass} rounded="md" hoverScale={false} />
          <p className="truncate text-sm font-semibold text-foreground">{selectedNode.node_name}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-muted">
            {metaParts.map((part) => (
              <React.Fragment key={part}>
                <span className="text-border">·</span>
                <span>{part}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {isKnowledge ? (
          <>
            <div className={cn('flex flex-col gap-4', PANEL_CLASS)}>
              <div className="flex h-5 items-baseline gap-1.5">
                <p className="text-[13px] font-semibold text-foreground">学习概况</p>
              </div>
              <div className="grid flex-1 grid-cols-2 items-center">
                <div className="flex min-w-0 items-center gap-4 pr-5">
                  <OverviewRing percent={selectedNode.percentage} strokeColor="var(--color-secondary)" size={92} strokeWidth={10} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-none text-text-muted">完成率</p>
                    <p className="mt-2.5 text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
                      {completionPercent}%
                    </p>
                  </div>
                </div>
                <div
                  className="min-w-0 border-l border-border/70 pl-6"
                  title={selectedNode.average_time !== null && selectedNode.average_time > 0 ? `${selectedNode.average_time} 分钟` : undefined}
                >
                  <p className="truncate text-xs font-medium leading-none text-text-muted">平均用时</p>
                  <p className="mt-2.5 text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
                    {formatDurationClock(selectedNode.average_time)}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn('flex flex-col gap-4', PANEL_CLASS)}>
              <div className="flex h-5 items-baseline gap-1.5">
                <p className="text-[13px] font-semibold text-foreground">人员状态</p>
                <span className="text-xs text-text-muted">(人)</span>
              </div>
              <div className="flex flex-1 items-center">
                <StatusDonutChart
                  totalCount={selectedNode.total_count}
                  segments={[
                    { label: '已学习', count: selectedNode.completed_count, strokeColor: 'var(--color-secondary)', dotClassName: 'bg-secondary-500' },
                    { label: '未学习', count: selectedNode.pending_count, strokeColor: 'var(--color-primary)', dotClassName: 'bg-primary-500' },
                    { label: '已逾期', count: selectedNode.overdue_count, strokeColor: 'var(--color-destructive)', dotClassName: 'bg-destructive-500' },
                  ]}
                />
              </div>
            </div>
          </>
        ) : (
          <QuizSummaryPanel selectedNode={selectedNode} isExam={isExam} />
        )}

        <div className={PANEL_CLASS}>
          <DistributionColumn title="时间分布" unit="分钟" items={selectedNode.time_distribution} barClassName="bg-primary" />
        </div>

        {!isKnowledge && selectedNode.score_distribution ? (
          <div className={PANEL_CLASS}>
            <DistributionColumn title="得分率分布" unit="%" items={selectedNode.score_distribution} barClassName="bg-secondary" />
          </div>
        ) : null}
      </div>
    </Card>
  );
};

const QuizSummaryPanel: React.FC<{
  selectedNode: TaskNodeProgress;
  isExam: boolean;
}> = ({ selectedNode, isExam }) => {
  const topRowItems: SummaryMetricItem[] = [
    { label: '完成率', value: `${Math.round(selectedNode.percentage)}%`, ringPercent: selectedNode.percentage, ringColor: 'var(--color-secondary)' },
  ];
  if (isExam && selectedNode.pass_rate !== null) {
    topRowItems.push({ label: '通过率', value: `${Math.round(selectedNode.pass_rate)}%`, ringPercent: selectedNode.pass_rate, ringColor: 'var(--color-warning)' });
  }
  topRowItems.push({
    label: '平均分数',
    value: selectedNode.average_score !== null ? `${formatScore(selectedNode.average_score)}` : '—',
    unit: selectedNode.average_score !== null ? '分' : undefined,
  });

  const bottomRowItems: SummaryMetricItem[] = isExam && selectedNode.passed_count !== null
    ? [
      { label: '及格', value: `${selectedNode.passed_count}` },
      { label: '未及格', value: `${selectedNode.failed_count ?? 0}` },
      { label: '进行中', value: `${selectedNode.pending_count}` },
      { label: '已逾期', value: `${selectedNode.overdue_count}` },
    ]
    : [
      { label: '已完成', value: `${selectedNode.completed_count}` },
      { label: '未完成', value: `${selectedNode.pending_count}` },
      { label: '已逾期', value: `${selectedNode.overdue_count}` },
    ];

  return (
    <div className={cn('flex flex-col justify-center gap-6', PANEL_CLASS)}>
      <div className={cn('grid gap-4', topRowItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {topRowItems.map((item, index) => (
          <div key={item.label} className={cn('min-w-0', index > 0 && 'border-l border-border/70 pl-4')}>
            <p className="truncate text-xs font-medium leading-none text-text-muted">{item.label}</p>
            <div className="mt-2.5 flex h-7 items-center gap-2">
              {item.ringPercent !== undefined && item.ringColor && (
                <OverviewRing percent={item.ringPercent} strokeColor={item.ringColor} size={26} strokeWidth={3.5} />
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-[22px] font-bold leading-none tracking-tight tabular-nums text-foreground">{item.value}</span>
                {item.unit && <span className="text-xs font-medium text-text-muted">{item.unit}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 pt-5">
        <div className={cn(isExam && 'flex items-start gap-4')}>
          <div className={cn('grid', isExam ? 'min-w-0 flex-1 gap-3' : 'gap-4', bottomRowItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
            {bottomRowItems.map((item) => (
              <div key={item.label} className="min-w-0">
                <span className="block text-xl font-bold leading-none tracking-tight tabular-nums text-foreground">{item.value}</span>
                <p className="mt-2 truncate text-xs font-medium leading-none text-text-muted">{item.label}</p>
              </div>
            ))}
          </div>
          {isExam ? (
            <div title="考试用时低于参考时长 20%" className="shrink-0 border-l border-border/70 pl-4">
              <span className={cn('block text-xl font-bold leading-none tracking-tight tabular-nums', selectedNode.abnormal_count > 0 ? 'text-destructive' : 'text-foreground')}>
                {selectedNode.abnormal_count}
              </span>
              <p className={cn('mt-2 whitespace-nowrap text-xs font-medium leading-none', selectedNode.abnormal_count > 0 ? 'text-destructive/80' : 'text-text-muted')}>
                异常用时
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const StatusDonutChart: React.FC<{
  totalCount: number;
  segments: Array<{ label: string; count: number; strokeColor: string; dotClassName: string }>;
}> = ({ totalCount, segments }) => (
  <div className="flex w-full items-center gap-7">
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: 92, height: 92 }}>
      <OverviewRing
        size={92}
        strokeWidth={10}
        reverse={false}
        segments={totalCount > 0 ? segments.map((s) => ({ key: s.label, ratio: s.count / totalCount, color: s.strokeColor })) : []}
      />
    </div>
    <div className="min-w-0 flex-1 space-y-3">
      {segments.map((segment) => (
        <div key={segment.label} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', segment.dotClassName)} />
            <span className="text-xs font-medium text-text-muted">{segment.label}</span>
          </div>
          <span className={cn('font-mono text-xs font-medium tabular-nums', segment.count > 0 ? 'text-foreground' : 'text-text-muted/50')}>
            {segment.count}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const DistributionColumn: React.FC<{
  title: string;
  unit: string;
  items: DistributionItem[];
  barClassName: string;
}> = ({ title, unit, items, barClassName }) => {
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-5 items-baseline gap-1.5">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <span className="text-xs text-text-muted">({unit})</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-text-muted">暂无分布数据</div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-3.5">
          {items.map((item) => (
            <div key={item.range} className="group flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-xs font-medium text-text-muted tabular-nums">{item.range}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/80">
                {item.count > 0 && totalCount > 0 && (
                  <div
                    className={cn('h-full rounded-full transition-all duration-300 ease-out group-hover:opacity-85', barClassName)}
                    style={{ width: `${(item.count / totalCount) * 100}%`, minWidth: '6px' }}
                  />
                )}
              </div>
              <span className={cn('w-7 shrink-0 text-right font-mono text-xs font-medium tabular-nums', item.count > 0 ? 'text-foreground' : 'text-text-muted/50')}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
