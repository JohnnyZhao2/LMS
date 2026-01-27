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
import { Card, Skeleton } from '@/components/ui';
import {
  DataTable,
  CellWithIcon,
} from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  StudentExecution,
} from '@/types/task-analytics';
import { useTaskAnalytics, useStudentExecutions } from '../../api/task-analytics';
import { IconBox } from '@/components/common';
import { StatCard } from '@/components/ui/stat-card';

interface ProgressMonitoringTabProps {
  taskId?: number;
}

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

  // 聚合节点进度为三个类别
  const aggregatedProgress = React.useMemo(() => {
    if (!analytics?.node_progress) return [];

    const categories: { key: string; label: string; icon: LucideIcon; textClass: string; bgClass: string; barClass: string }[] = [
      { key: 'KNOWLEDGE', label: '知识学习', icon: BookOpen, textClass: 'text-secondary', bgClass: 'bg-secondary-50', barClass: 'bg-secondary' },
      { key: 'PRACTICE', label: '随堂测验', icon: FileQuestion, textClass: 'text-primary', bgClass: 'bg-primary-50', barClass: 'bg-primary' },
      { key: 'EXAM', label: '结业考核', icon: GraduationCap, textClass: 'text-primary-500', bgClass: 'bg-primary-50', barClass: 'bg-primary-500' },
    ];

    return categories.map(({ key, label, icon, textClass, bgClass, barClass }) => {
      const nodes = analytics.node_progress.filter((n) => n.category === key);

      if (nodes.length === 0) return null;

      const totalCount = nodes[0].total_count;
      const nodeCount = nodes.length;
      const avgCompleted = Math.round(nodes.reduce((sum, n) => sum + n.completed_count, 0) / nodeCount);
      const percentage = Math.round((avgCompleted / totalCount) * 100);

      return { key, label, icon, textClass, bgClass, barClass, nodeCount, completedCount: avgCompleted, totalCount, percentage };
    }).filter(Boolean) as {
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
    }[];
  }, [analytics]);

  const columns: ColumnDef<StudentExecution>[] = [
    {
      header: '学员信息',
      id: 'student_info',
      cell: ({ row }) => (
        <CellWithIcon
          icon={<Users className="h-4 w-4 text-text-muted" />}
          title={row.original.student_name}
          subtitle={`${row.original.employee_id} · ${row.original.department}`}
        />
      ),
    },
    {
      header: '状态判定',
      id: 'status',
      cell: ({ row }) => {
        const statusMap: Record<string, { text: string; textClass: string; bgClass: string }> = {
          COMPLETED: { text: '已完成', textClass: 'text-secondary', bgClass: 'bg-secondary-100' },
          IN_PROGRESS: { text: '进行中', textClass: 'text-primary-600', bgClass: 'bg-primary-100' },
          OVERDUE: { text: '已逾期', textClass: 'text-destructive', bgClass: 'bg-destructive-100' },
          COMPLETED_ABNORMAL: { text: '完成但异常', textClass: 'text-warning', bgClass: 'bg-warning-100' },
        };
        const status = statusMap[row.original.status] || statusMap.IN_PROGRESS;
        return (
          <span
            className={cn(
              'inline-flex px-2.5 py-1 rounded-md text-xs font-semibold',
              status.textClass,
              status.bgClass
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
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground tabular-nums">
          {row.original.node_progress}
        </span>
      ),
    },
    {
      header: '分数',
      id: 'score',
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
      cell: ({ row }) => (
        <span className="text-sm text-text-muted tabular-nums">
          {row.original.time_spent} 分钟
        </span>
      ),
    },
    {
      header: '答题情况',
      id: 'answer_details',
      cell: ({ row }) => (
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150 cursor-pointer">
          {row.original.answer_details}
        </button>
      ),
    },
  ];

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="完成人数"
          value={`${analytics.completion.completed_count}/${analytics.completion.total_count}`}
          subtitle={`${analytics.completion.percentage}%`}
          icon={Users}
          iconClassName="text-primary"
          accentClassName="bg-primary-50"
          size="sm"
        />
        <StatCard
          title="平均用时"
          value={`${analytics.average_time}`}
          subtitle="分钟"
          icon={Clock}
          iconClassName="text-secondary"
          accentClassName="bg-secondary-50"
          size="sm"
        />
        <StatCard
          title={analytics.accuracy.has_quiz ? '准确率' : '考试情况'}
          value={analytics.accuracy.has_quiz ? `${analytics.accuracy.percentage}%` : '无考试'}
          subtitle={analytics.accuracy.has_quiz ? '平均正确率' : ''}
          icon={Target}
          iconClassName="text-primary-500"
          accentClassName="bg-primary-50"
          size="sm"
        />
        <StatCard
          title="异常人数"
          value={analytics.abnormal_count.toString()}
          subtitle="需关注"
          icon={AlertTriangle}
          iconClassName={analytics.abnormal_count > 0 ? 'text-destructive' : 'text-text-muted'}
          accentClassName={analytics.abnormal_count > 0 ? 'bg-destructive-50' : 'bg-muted'}
          size="sm"
        />
      </div>

      {/* Row 2: Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Node Progress (Aggregated by Category) */}
        <Card className="p-6 border border-border">
          <h3 className="text-base font-semibold text-foreground mb-5">任务节点完成情况</h3>
          <div className="space-y-4">
            {aggregatedProgress.map((category) => (
              <CategoryProgressBar key={category.key} category={category} />
            ))}
            {aggregatedProgress.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">暂无任务节点</p>
            )}
          </div>
        </Card>

        {/* Right: Distribution Chart */}
        <Card className="p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <h3 className="text-base font-semibold text-foreground">分布统计</h3>
              {analytics.pass_rate !== null && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                  analytics.pass_rate >= 80 ? "bg-secondary-50 border-secondary-200 text-secondary-700" :
                  analytics.pass_rate >= 60 ? "bg-warning-50 border-warning-200 text-warning-700" :
                  "bg-destructive-50 border-destructive-200 text-destructive-700"
                )}>
                  <span className="text-xs font-medium">通过率</span>
                  <span className={cn(
                    "text-sm font-bold tabular-nums",
                    analytics.pass_rate >= 80 ? "text-secondary-900" :
                    analytics.pass_rate >= 60 ? "text-warning-900" :
                    "text-destructive-900"
                  )}>{analytics.pass_rate}%</span>
                </div>
              )}
            </div>
            {hasScoreDistribution && (
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setChartType('time')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
                    chartType === 'time'
                      ? 'bg-background text-foreground'
                      : 'text-text-muted hover:text-foreground'
                  )}
                >
                  时间分布
                </button>
                <button
                  onClick={() => setChartType('score')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
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
      </div>

      {/* Row 3: Student Execution Table */}
      <Card className="p-6 border border-border">
        <h3 className="text-base font-semibold text-foreground mb-5">学员执行情况</h3>
        <DataTable
          columns={columns}
          data={students || []}
          rowClassName="hover:bg-muted transition-colors duration-150 cursor-pointer"
        />
      </Card>
    </div>
  );
};

// Category Progress Bar Component (Aggregated)
interface CategoryProgressBarProps {
  category: {
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
}

const CategoryProgressBar: React.FC<CategoryProgressBarProps> = ({ category }) => {
  return (
    <div className="space-y-2 group cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBox
            icon={category.icon}
            size="sm"
            bgColor={category.bgClass}
            iconColor={category.textClass}
            rounded="md"
            hoverScale={false}
          />
          <span className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors duration-200">
            {category.label}
          </span>
          <span className="text-xs text-text-muted">
            ({category.nodeCount}项)
          </span>
        </div>
        <span className="text-sm text-text-muted tabular-nums">
          {category.completedCount}/{category.totalCount} <span className="text-text-muted">({category.percentage}%)</span>
        </span>
      </div>
      <div className="h-7 bg-muted rounded-md overflow-hidden">
        <div
          className={cn("h-full rounded-md transition-all duration-500 ease-out", category.barClass)}
          style={{ width: `${category.percentage}%` }}
        />
      </div>
    </div>
  );
};

// Distribution Chart Component (Simple bar chart)
interface DistributionChartProps {
  data: { range: string; count: number }[];
  type: 'time' | 'score';
}

const DistributionChart: React.FC<DistributionChartProps> = ({ data, type }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barClassName = type === 'time' ? 'bg-primary' : 'bg-secondary';

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.range} className="flex items-center gap-3 group cursor-pointer">
          <span className="w-16 text-xs text-text-muted text-right tabular-nums font-medium">
            {item.range}
          </span>
          <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
            <div
              className={cn(
                "h-full rounded-md transition-all duration-300 ease-out flex items-center justify-end pr-2 group-hover:opacity-80",
                barClassName
              )}
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                minWidth: item.count > 0 ? '28px' : '0',
              }}
            >
              {item.count > 0 && (
                <span className="text-xs font-semibold text-white tabular-nums">{item.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
