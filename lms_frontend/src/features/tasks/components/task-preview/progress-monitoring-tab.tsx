import * as React from 'react';
import {
  Users,
  Clock,
  Target,
  AlertTriangle,
  BookOpen,
  FileQuestion,
  GraduationCap,
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

    const categories = [
      { key: 'KNOWLEDGE', label: '知识学习', icon: BookOpen, color: '#10B981' },
      { key: 'PRACTICE', label: '随堂测验', icon: FileQuestion, color: '#3B82F6' },
      { key: 'EXAM', label: '结业考核', icon: GraduationCap, color: '#8B5CF6' },
    ];

    return categories.map(({ key, label, icon, color }) => {
      const nodes = analytics.node_progress.filter((n) => n.category === key);

      if (nodes.length === 0) return null;

      const totalCount = nodes[0].total_count;
      const nodeCount = nodes.length;
      const avgCompleted = Math.round(nodes.reduce((sum, n) => sum + n.completed_count, 0) / nodeCount);
      const percentage = Math.round((avgCompleted / totalCount) * 100);

      return { key, label, icon, color, nodeCount, completedCount: avgCompleted, totalCount, percentage };
    }).filter(Boolean) as {
      key: string;
      label: string;
      icon: React.ElementType;
      color: string;
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
          icon={<Users className="h-4 w-4 text-slate-400" />}
          title={row.original.student_name}
          subtitle={`${row.original.employee_id} · ${row.original.department}`}
        />
      ),
    },
    {
      header: '状态判定',
      id: 'status',
      cell: ({ row }) => {
        const statusMap: Record<string, { text: string; color: string; bg: string }> = {
          COMPLETED: { text: '已完成', color: '#059669', bg: '#D1FAE5' },
          IN_PROGRESS: { text: '进行中', color: '#2563EB', bg: '#DBEAFE' },
          OVERDUE: { text: '已逾期', color: '#DC2626', bg: '#FEE2E2' },
          COMPLETED_ABNORMAL: { text: '完成但异常', color: '#D97706', bg: '#FEF3C7' },
        };
        const status = statusMap[row.original.status] || statusMap.IN_PROGRESS;
        return (
          <span
            className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ color: status.color, backgroundColor: status.bg }}
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
        <span className="text-sm font-medium text-slate-700 tabular-nums">
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
          row.original.score !== null ? 'text-slate-900' : 'text-slate-400'
        )}>
          {row.original.score !== null ? row.original.score : '-'}
        </span>
      ),
    },
    {
      header: '用时',
      id: 'time_spent',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 tabular-nums">
          {row.original.time_spent} 分钟
        </span>
      ),
    },
    {
      header: '答题情况',
      id: 'answer_details',
      cell: ({ row }) => (
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-150 cursor-pointer">
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
        <KPICard
          title="完成人数"
          value={`${analytics.completion.completed_count}/${analytics.completion.total_count}`}
          subtitle={`${analytics.completion.percentage}%`}
          icon={Users}
          color="#3B82F6"
        />
        <KPICard
          title="平均用时"
          value={`${analytics.average_time}`}
          subtitle="分钟"
          icon={Clock}
          color="#10B981"
        />
        <KPICard
          title={analytics.accuracy.has_quiz ? '准确率' : '考试情况'}
          value={analytics.accuracy.has_quiz ? `${analytics.accuracy.percentage}%` : '无考试'}
          subtitle={analytics.accuracy.has_quiz ? '平均正确率' : ''}
          icon={Target}
          color="#8B5CF6"
        />
        <KPICard
          title="异常人数"
          value={analytics.abnormal_count.toString()}
          subtitle="需关注"
          icon={AlertTriangle}
          color={analytics.abnormal_count > 0 ? '#DC2626' : '#6B7280'}
        />
      </div>

      {/* Row 2: Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Node Progress (Aggregated by Category) */}
        <Card className="p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-slate-900 mb-5">任务节点完成情况</h3>
          <div className="space-y-4">
            {aggregatedProgress.map((category) => (
              <CategoryProgressBar key={category.key} category={category} />
            ))}
            {aggregatedProgress.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">暂无任务节点</p>
            )}
          </div>
        </Card>

        {/* Right: Distribution Chart */}
        <Card className="p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-900">分布统计</h3>
            {hasScoreDistribution && (
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('time')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
                    chartType === 'time'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  时间分布
                </button>
                <button
                  onClick={() => setChartType('score')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
                    chartType === 'score'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
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
      <Card className="p-6 border border-gray-100">
        <h3 className="text-base font-semibold text-slate-900 mb-5">学员执行情况</h3>
        <DataTable
          columns={columns}
          data={students || []}
          rowClassName="hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
        />
      </Card>
    </div>
  );
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon, color }) => (
  <Card className="p-5 cursor-pointer hover:shadow-md transition-shadow duration-200 ease-out border border-gray-100">
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{title}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{value}</span>
          {subtitle && <span className="text-sm text-slate-500">{subtitle}</span>}
        </div>
      </div>
    </div>
  </Card>
);

// Category Progress Bar Component (Aggregated)
interface CategoryProgressBarProps {
  category: {
    key: string;
    label: string;
    icon: React.ElementType;
    color: string;
    nodeCount: number;
    completedCount: number;
    totalCount: number;
    percentage: number;
  };
}

const CategoryProgressBar: React.FC<CategoryProgressBarProps> = ({ category }) => {
  const Icon = category.icon;

  return (
    <div className="space-y-2 group cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-200"
            style={{ backgroundColor: `${category.color}12` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
          </div>
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors duration-200">
            {category.label}
          </span>
          <span className="text-xs text-slate-400">
            ({category.nodeCount}项)
          </span>
        </div>
        <span className="text-sm text-slate-500 tabular-nums">
          {category.completedCount}/{category.totalCount} <span className="text-slate-400">({category.percentage}%)</span>
        </span>
      </div>
      <div className="h-7 bg-slate-100 rounded-md overflow-hidden">
        <div
          className="h-full rounded-md transition-all duration-500 ease-out"
          style={{ width: `${category.percentage}%`, backgroundColor: category.color }}
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
  const color = type === 'time' ? '#3B82F6' : '#10B981';

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.range} className="flex items-center gap-3 group cursor-pointer">
          <span className="w-16 text-xs text-slate-500 text-right tabular-nums font-medium">
            {item.range}
          </span>
          <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden">
            <div
              className="h-full rounded-md transition-all duration-300 ease-out flex items-center justify-end pr-2 group-hover:opacity-80"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: color,
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
