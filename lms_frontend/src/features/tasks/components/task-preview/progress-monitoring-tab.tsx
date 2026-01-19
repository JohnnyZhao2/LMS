import * as React from 'react';
import {
  Users,
  Clock,
  Target,
  AlertTriangle,
  BookOpen,
  FileQuestion,
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
  TaskNodeProgress,
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

  const columns: ColumnDef<StudentExecution>[] = [
    {
      header: '学员信息',
      id: 'student_info',
      cell: ({ row }) => (
        <CellWithIcon
          icon={<Users className="h-4 w-4" />}
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
          COMPLETED: { text: '已完成', color: '#10B981', bg: '#D1FAE5' },
          IN_PROGRESS: { text: '进行中', color: '#3B82F6', bg: '#DBEAFE' },
          OVERDUE: { text: '已逾期', color: '#DC2626', bg: '#FEE2E2' },
          COMPLETED_ABNORMAL: { text: '完成但异常', color: '#F59E0B', bg: '#FEF3C7' },
        };
        const status = statusMap[row.original.status] || statusMap.IN_PROGRESS;
        return (
          <span
            className="px-2.5 py-1 rounded-md text-xs font-semibold"
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
        <span className="text-sm font-medium text-gray-700">
          {row.original.node_progress}
        </span>
      ),
    },
    {
      header: '分数',
      id: 'score',
      cell: ({ row }) => (
        <span className={cn(
          'text-sm font-bold',
          row.original.score !== null ? 'text-gray-900' : 'text-gray-400'
        )}>
          {row.original.score !== null ? row.original.score : '-'}
        </span>
      ),
    },
    {
      header: '用时',
      id: 'time_spent',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.time_spent} 分钟
        </span>
      ),
    },
    {
      header: '答题情况',
      id: 'answer_details',
      cell: ({ row }) => (
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
        {/* Left: Node Progress */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">任务节点完成情况</h3>
          <div className="space-y-4">
            {analytics.node_progress.map((node) => (
              <NodeProgressBar key={node.node_id} node={node} />
            ))}
          </div>
        </Card>

        {/* Right: Distribution Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">分布统计</h3>
            {hasScoreDistribution && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('time')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    chartType === 'time'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  时间分布
                </button>
                <button
                  onClick={() => setChartType('score')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    chartType === 'score'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">学员执行情况</h3>
        <DataTable
          columns={columns}
          data={students || []}
          rowClassName="hover:bg-gray-50"
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
  <Card className="p-5 hover:scale-[1.02] transition-transform">
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
        </div>
      </div>
    </div>
  </Card>
);

// Node Progress Bar Component
interface NodeProgressBarProps {
  node: TaskNodeProgress;
}

const NodeProgressBar: React.FC<NodeProgressBarProps> = ({ node }) => {
  const Icon = node.node_type === 'KNOWLEDGE' ? BookOpen : FileQuestion;
  const color = node.node_type === 'KNOWLEDGE' ? '#10B981' : '#3B82F6';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-sm font-medium text-gray-700">{node.node_name}</span>
        </div>
        <span className="text-sm text-gray-500">
          {node.completed_count}/{node.total_count} ({node.percentage}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${node.percentage}%`, backgroundColor: color }}
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
        <div key={item.range} className="flex items-center gap-3">
          <span className="w-16 text-xs text-gray-500 text-right">
            {type === 'time' ? `${item.range}分` : `${item.range}分`}
          </span>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500 flex items-center justify-end pr-2"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: color,
                minWidth: item.count > 0 ? '24px' : '0',
              }}
            >
              {item.count > 0 && (
                <span className="text-xs font-medium text-white">{item.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
