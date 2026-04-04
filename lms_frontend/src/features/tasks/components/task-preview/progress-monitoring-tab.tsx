import * as React from 'react';
import {
  Users,
  Clock,
  Target,
  AlertTriangle,
  BookOpen,
  FileQuestion,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table/data-table';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  StudentExecution,
  TaskAnalytics,
} from '@/types/task-analytics';
import { useTaskAnalytics, useStudentExecutions } from '../../api/task-analytics';
import { IconBox } from '@/components/common/icon-box';
import { UserAvatar } from '@/components/common/user-avatar';
import { StatCard } from '@/components/ui/stat-card';
import { CellWithAvatar } from '@/components/ui/data-table/data-table-cells';

interface ProgressMonitoringTabProps {
  taskId?: number;
}

type AggregatedProgressCategory = {
  key: string;
  label: string;
  icon: LucideIcon;
  textClass: string;
  bgClass: string;
  barClass: string;
  nodeCount: number;
  completedCount: number;
  totalCount: number;
  percentage: number;
};

const progressCategories: Omit<AggregatedProgressCategory, 'nodeCount' | 'completedCount' | 'totalCount' | 'percentage'>[] = [
  { key: 'KNOWLEDGE', label: '知识学习', icon: BookOpen, textClass: 'text-secondary', bgClass: 'bg-secondary-50', barClass: 'bg-secondary' },
  { key: 'PRACTICE', label: '随堂测验', icon: FileQuestion, textClass: 'text-primary', bgClass: 'bg-primary-50', barClass: 'bg-primary' },
  { key: 'EXAM', label: '结业考核', icon: GraduationCap, textClass: 'text-primary-500', bgClass: 'bg-primary-50', barClass: 'bg-primary-500' },
];

const studentStatusMap: Record<StudentExecution['status'], { text: string; textClass: string; bgClass: string }> = {
  COMPLETED: { text: '已完成', textClass: 'text-secondary', bgClass: 'bg-secondary-100' },
  IN_PROGRESS: { text: '进行中', textClass: 'text-primary-600', bgClass: 'bg-primary-100' },
  OVERDUE: { text: '已逾期', textClass: 'text-destructive', bgClass: 'bg-destructive-100' },
  COMPLETED_ABNORMAL: { text: '完成但异常', textClass: 'text-warning', bgClass: 'bg-warning-100' },
};

export const ProgressMonitoringTab: React.FC<ProgressMonitoringTabProps> = ({ taskId }) => {
  const [chartType, setChartType] = React.useState<'time' | 'score'>('time');

  const { data: analytics, isLoading: analyticsLoading } = useTaskAnalytics(taskId || 0, {
    enabled: Boolean(taskId),
  });
  const { data: students, isLoading: studentsLoading } = useStudentExecutions(taskId || 0, {
    enabled: Boolean(taskId),
  });

  const isLoading = analyticsLoading || studentsLoading;
  const hasScoreDistribution = analytics?.score_distribution != null;
  const studentExecutions = students || [];

  const aggregatedProgress = React.useMemo(() => {
    if (!analytics?.node_progress) return [];

    return progressCategories.map(({ key, label, icon, textClass, bgClass, barClass }) => {
      const nodes = analytics.node_progress.filter((n) => n.category === key);

      if (nodes.length === 0) return null;

      const totalCount = nodes[0].total_count;
      const nodeCount = nodes.length;
      const avgCompleted = Math.round(nodes.reduce((sum, n) => sum + n.completed_count, 0) / nodeCount);
      const percentage = Math.round((avgCompleted / totalCount) * 100);

      return { key, label, icon, textClass, bgClass, barClass, nodeCount, completedCount: avgCompleted, totalCount, percentage };
    }).filter(Boolean) as AggregatedProgressCategory[];
  }, [analytics]);

  const columns = React.useMemo<ColumnDef<StudentExecution>[]>(() => [
    {
      header: '学员信息',
      id: 'student_info',
      size: 280,
      minSize: 240,
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.student_name}
          subtitle={`${row.original.employee_id} · ${row.original.department}`}
          avatar={(
            <UserAvatar
              avatarKey={row.original.avatar_key}
              name={row.original.student_name}
              size="md"
            />
          )}
        />
      ),
    },
    {
      header: '状态判定',
      id: 'status',
      size: 126,
      minSize: 110,
      cell: ({ row }) => {
        const status = studentStatusMap[row.original.status];
        return (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap',
              status.textClass,
              status.bgClass,
            )}
          >
            {status.text}
          </span>
        );
      },
    },
    {
      header: '任务节点进度',
      id: 'node_progress',
      size: 120,
      minSize: 110,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground tabular-nums">
          {row.original.node_progress}
        </span>
      ),
    },
    {
      header: '分数',
      id: 'score',
      size: 88,
      minSize: 80,
      cell: ({ row }) => (
        <span className={cn(
          'text-sm font-bold tabular-nums',
          row.original.score !== null ? 'text-foreground' : 'text-text-muted'
        )}>
          {row.original.score !== null ? row.original.score : '-'}
        </span>
      ),
    },
    {
      header: '用时',
      id: 'time_spent',
      size: 110,
      minSize: 100,
      cell: ({ row }) => (
        <span className="text-sm text-text-muted tabular-nums">
          {row.original.time_spent} 分钟
        </span>
      ),
    },
    {
      header: '答题情况',
      id: 'answer_details',
      size: 104,
      minSize: 96,
      cell: ({ row }) => (
        <button className="cursor-pointer text-sm font-medium text-primary-600 transition-colors duration-150 hover:text-primary-700">
          {row.original.answer_details}
        </button>
      ),
    },
  ], []);

  if (isLoading || !analytics) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
        <Skeleton className="min-h-0 flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ProgressMetricGrid analytics={analytics} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <NodeProgressPanel aggregatedProgress={aggregatedProgress} />
        <DistributionPanel
          analytics={analytics}
          chartType={chartType}
          hasScoreDistribution={hasScoreDistribution}
          onChartTypeChange={setChartType}
        />
      </div>

      <DataTable
        columns={columns}
        data={studentExecutions}
        header={(
          <>
            <p className="text-xs font-semibold tracking-[0.08em] text-text-muted">
              执行列表
            </p>
            <div className="text-xs text-text-muted">
              共 <span className="font-semibold tabular-nums text-foreground">{studentExecutions.length}</span> 人
            </div>
          </>
        )}
        className="mt-0"
        fillHeight
        minHeight={0}
      />
    </div>
  );
};

const ProgressMetricGrid: React.FC<{ analytics: TaskAnalytics }> = ({ analytics }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard
      title="完成人数"
      value={`${analytics.completion.completed_count}/${analytics.completion.total_count}`}
      subtitle={`${analytics.completion.percentage}%`}
      icon={Users}
      iconClassName="text-primary"
      accentClassName="bg-primary-50"
      size="xs"
    />
    <StatCard
      title="平均用时"
      value={`${analytics.average_time}`}
      subtitle="分钟"
      icon={Clock}
      iconClassName="text-secondary"
      accentClassName="bg-secondary-50"
      size="xs"
    />
    <StatCard
      title={analytics.accuracy.has_quiz ? '准确率' : '考试情况'}
      value={analytics.accuracy.has_quiz ? `${analytics.accuracy.percentage}%` : '无考试'}
      subtitle={analytics.accuracy.has_quiz ? '平均正确率' : ''}
      icon={Target}
      iconClassName="text-primary-500"
      accentClassName="bg-primary-50"
      size="xs"
    />
    <StatCard
      title="异常人数"
      value={analytics.abnormal_count.toString()}
      subtitle="需关注"
      icon={AlertTriangle}
      iconClassName={analytics.abnormal_count > 0 ? 'text-destructive' : 'text-text-muted'}
      accentClassName={analytics.abnormal_count > 0 ? 'bg-destructive-50' : 'bg-muted'}
      size="xs"
    />
  </div>
);

const NodeProgressPanel: React.FC<{ aggregatedProgress: AggregatedProgressCategory[] }> = ({ aggregatedProgress }) => (
  <Card className="border border-border/70 p-4">
    <div className="mb-3">
      <p className="text-xs font-semibold tracking-[0.08em] text-text-muted">节点概览</p>
    </div>

    <div className="space-y-3">
      {aggregatedProgress.map((category) => (
        <CategoryProgressBar key={category.key} category={category} />
      ))}
      {aggregatedProgress.length === 0 && (
        <p className="py-4 text-center text-sm text-text-muted">暂无任务节点</p>
      )}
    </div>
  </Card>
);

interface DistributionPanelProps {
  analytics: TaskAnalytics;
  chartType: 'time' | 'score';
  hasScoreDistribution: boolean;
  onChartTypeChange: (type: 'time' | 'score') => void;
}

const DistributionPanel: React.FC<DistributionPanelProps> = ({
  analytics,
  chartType,
  hasScoreDistribution,
  onChartTypeChange,
}) => (
  <Card className="border border-border/70 p-4">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.08em] text-text-muted">结果分布</p>
        <div className="flex flex-wrap items-center gap-2">
          {analytics.pass_rate !== null && (
            <div className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
              analytics.pass_rate >= 80 ? 'border-secondary-200 bg-secondary-50 text-secondary-700' :
              analytics.pass_rate >= 60 ? 'border-warning-200 bg-warning-50 text-warning-700' :
              'border-destructive-200 bg-destructive-50 text-destructive-700',
            )}>
              <span className="text-[11px] font-medium">通过率</span>
              <span className={cn(
                'text-xs font-bold tabular-nums',
                analytics.pass_rate >= 80 ? 'text-secondary-900' :
                analytics.pass_rate >= 60 ? 'text-warning-900' :
                'text-destructive-900',
              )}>
                {analytics.pass_rate}%
              </span>
            </div>
          )}
        </div>
      </div>

      {hasScoreDistribution && (
        <div className="flex rounded-xl bg-muted p-1">
          <button
            onClick={() => onChartTypeChange('time')}
            className={cn(
              'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200',
              chartType === 'time'
                ? 'bg-background text-foreground'
                : 'text-text-muted hover:text-foreground'
            )}
          >
            时间分布
          </button>
          <button
            onClick={() => onChartTypeChange('score')}
            className={cn(
              'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200',
              chartType === 'score'
                ? 'bg-background text-foreground'
                : 'text-text-muted hover:text-foreground'
            )}
          >
            分数分布
          </button>
        </div>
      )}
    </div>

    <DistributionChart
      data={chartType === 'time' ? analytics.time_distribution : (analytics.score_distribution || [])}
      type={chartType}
    />
  </Card>
);

interface CategoryProgressBarProps {
  category: AggregatedProgressCategory;
}

const CategoryProgressBar: React.FC<CategoryProgressBarProps> = ({ category }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconBox
            icon={category.icon}
            size="sm"
            bgColor={category.bgClass}
            iconColor={category.textClass}
            rounded="md"
            hoverScale={false}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{category.label}</span>
              <span className="text-[11px] text-text-muted">{category.nodeCount}项</span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-text-muted tabular-nums">
          {category.completedCount}/{category.totalCount} ({category.percentage}%)
        </span>
      </div>
      <div className="h-5 overflow-hidden rounded-md bg-muted/80">
        <div
          className={cn("h-full rounded-md transition-all duration-500 ease-out", category.barClass)}
          style={{ width: `${category.percentage}%` }}
        />
      </div>
    </div>
  );
};

interface DistributionChartProps {
  data: { range: string; count: number }[];
  type: 'time' | 'score';
}

const DistributionChart: React.FC<DistributionChartProps> = ({ data, type }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-muted">
        暂无分布数据
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barClassName = type === 'time' ? 'bg-primary' : 'bg-secondary';

  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.range} className="group flex items-center gap-3">
          <span className="w-14 text-[11px] font-medium text-right text-text-muted tabular-nums">
            {item.range}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-muted/80">
            <div
              className={cn(
                "flex h-full items-center justify-end rounded-md pr-2 text-white transition-all duration-300 ease-out group-hover:opacity-85",
                barClassName
              )}
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                minWidth: item.count > 0 ? '28px' : '0',
              }}
            >
              {item.count > 0 && (
                <span className="text-[11px] font-semibold tabular-nums">{item.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
