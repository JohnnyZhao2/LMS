import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table/data-table';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import { formatScore } from '@/lib/score';
import { TASK_EXECUTION_STATUS_META } from '@/features/tasks/lib/task-status';
import type { ColumnDef } from '@tanstack/react-table';
import type { NodeExecutionStatus } from '@/types/common';
import type {
  StudentExecution,
  TaskAnalytics,
  TaskNodeProgress,
} from '@/types/task-analytics';
import { useStudentExecutions } from '@/api/grading/task-analytics';
import { IconBox } from '@/components/common/icon-box';
import { UserAvatar } from '@/components/users/user-avatar';
import { CellMutedTimestamp, CellWithAvatar } from '@/components/ui/data-table/data-table-cells';
import { NODE_CATEGORY_META } from './node-category-meta';
import { NodeDistributionCard } from './node-distribution-card';
import { OverviewRing } from './task-overview-strip';

interface ProgressMonitoringTabProps {
  taskId?: number;
  analytics?: TaskAnalytics;
  isLoading?: boolean;
  isError?: boolean;
}

type StatusFilter = 'ALL' | NodeExecutionStatus;

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
  { label: '全部', value: 'ALL' },
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '待批改', value: 'PENDING_GRADING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已逾期', value: 'OVERDUE' },
];

const getNodeKey = (node: Pick<TaskNodeProgress, 'category' | 'node_id'>) =>
  `${node.category}-${node.node_id}`;

const formatDuration = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 分钟';
  }
  if (minutes < 60) {
    return `${Math.round(minutes * 10) / 10} 分钟`;
  }
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 1440) {
    const hours = Math.floor(roundedMinutes / 60);
    const remMinutes = roundedMinutes % 60;
    return remMinutes > 0 ? `${hours} 小时 ${remMinutes} 分钟` : `${hours} 小时`;
  }
  const totalHours = Math.floor(roundedMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  return remHours > 0 ? `${days} 天 ${remHours} 小时` : `${days} 天`;
};

export const ProgressMonitoringTab: React.FC<ProgressMonitoringTabProps> = ({
  taskId,
  analytics,
  isLoading: analyticsLoading = false,
  isError: analyticsError = false,
}) => {
  const [selectedNodeKey, setSelectedNodeKey] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');

  const nodes = React.useMemo(
    () => analytics?.node_progress ?? [],
    [analytics?.node_progress],
  );

  const selectedNode = React.useMemo(() => {
    if (nodes.length === 0) return null;
    return nodes.find((n) => getNodeKey(n) === selectedNodeKey) ?? nodes[0];
  }, [nodes, selectedNodeKey]);

  const selectedCategory = selectedNode?.category ?? null;

  const { data: students, isLoading: studentsLoading } = useStudentExecutions(
    taskId || 0,
    selectedNode?.category ?? null,
    selectedNode?.node_id ?? null,
    { enabled: Boolean(taskId) && Boolean(selectedNode) }
  );

  const studentExecutions = React.useMemo(() => students ?? [], [students]);

  const statusFilterOptions = React.useMemo(
    () => (selectedCategory === 'KNOWLEDGE'
      ? STATUS_FILTER_OPTIONS.filter((option) => option.value !== 'PENDING_GRADING')
      : STATUS_FILTER_OPTIONS),
    [selectedCategory],
  );

  const effectiveStatusFilter: StatusFilter =
    selectedCategory === 'KNOWLEDGE' && statusFilter === 'PENDING_GRADING'
      ? 'ALL'
      : statusFilter;

  const filteredExecutions = React.useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    return studentExecutions.filter((row) => {
      if (effectiveStatusFilter !== 'ALL' && row.status !== effectiveStatusFilter) {
        return false;
      }
      if (!trimmed) {
        return true;
      }
      return (
        row.student_name.toLowerCase().includes(trimmed) ||
        row.employee_id.toLowerCase().includes(trimmed)
      );
    });
  }, [studentExecutions, searchQuery, effectiveStatusFilter]);

  const isFiltering = Boolean(searchQuery.trim()) || effectiveStatusFilter !== 'ALL';

  const columns = React.useMemo<ColumnDef<StudentExecution>[]>(() => {
    const baseColumns: ColumnDef<StudentExecution>[] = [
      {
        header: '学员信息',
        id: 'student_info',
        size: 200,
        minSize: 180,
        cell: ({ row }) => (
          <CellWithAvatar
            name={row.original.student_name}
            subtitle={[row.original.employee_id, row.original.department].filter(Boolean).join(' · ') || '—'}
            nameClassName="text-[13px]"
            className="py-0"
            avatar={(
              <UserAvatar
                avatarKey={row.original.avatar_key}
                name={row.original.student_name}
                size="md"
                className="h-8 w-8"
              />
            )}
          />
        ),
      },
      {
        header: '状态',
        id: 'status',
        size: 110,
        minSize: 96,
        cell: ({ row }) => {
          const status =
            TASK_EXECUTION_STATUS_META[row.original.status] ?? TASK_EXECUTION_STATUS_META.NOT_STARTED;
          return (
            <StatusDotLabel
              dotClassName={status.dotClassName}
              label={status.label}
              textClassName={status.textClassName}
            />
          );
        },
      },
      {
        header: '开始时间',
        id: 'started_at',
        size: 168,
        minSize: 164,
        cell: ({ row }) => renderTimestampCell(row.original.started_at),
      },
      {
        header: '结束时间',
        id: 'completed_at',
        size: 168,
        minSize: 164,
        cell: ({ row }) => renderTimestampCell(row.original.completed_at),
      },
      {
        header: '用时',
        id: 'time_spent',
        size: 120,
        minSize: 104,
        cell: ({ row }) => (
          <TimeSpentCell
            timeSpent={row.original.time_spent}
            isAbnormal={selectedCategory === 'EXAM' && row.original.is_abnormal}
          />
        ),
      },
    ];

    if (selectedCategory === 'PRACTICE' || selectedCategory === 'EXAM') {
      baseColumns.push(
        {
          header: '客观题',
          id: 'objective_score',
          size: 96,
          minSize: 84,
          cell: ({ row }) => <ScoreCell score={row.original.objective_score} />,
        },
        {
          header: '主观题',
          id: 'subjective_score',
          size: 100,
          minSize: 88,
          cell: ({ row }) => (
            <ScoreCell
              score={row.original.subjective_score}
              isPendingGrading={row.original.is_subjective_pending}
            />
          ),
        },
        {
          header: '总分',
          id: 'score',
          size: 92,
          minSize: 80,
          cell: ({ row }) => (
            <ScoreCell
              score={row.original.score}
              isFailed={row.original.is_passed === false}
            />
          ),
        },
      );
    }

    if (selectedCategory === 'PRACTICE') {
      baseColumns.push({
        header: '作答次数',
        id: 'attempt_count',
        size: 96,
        minSize: 84,
        cell: ({ row }) => (
          row.original.attempt_count !== null && row.original.attempt_count > 0 ? (
            <span className="flex h-5 items-center text-[13px] font-medium leading-5 text-text-muted tabular-nums">
              {row.original.attempt_count} 次
            </span>
          ) : (
            <MutedPlaceholder />
          )
        ),
      });
    }

    return baseColumns;
  }, [selectedCategory]);

  if (analyticsLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch">
        <Skeleton className="h-72 w-full rounded-xl xl:h-full xl:w-[336px] xl:shrink-0" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="min-h-0 w-full flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (analyticsError || !analytics) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-border/70 bg-muted/20 px-6 text-sm text-text-muted">
        {analyticsError ? '加载进度监控数据失败，请刷新重试' : '暂无进度监控数据'}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch">
      <div className="w-full xl:w-[336px] xl:shrink-0">
        <NodeSidebarPanel
          nodes={nodes}
          selectedNodeKey={selectedNode ? getNodeKey(selectedNode) : null}
          onSelectNode={(node) => {
            setSelectedNodeKey(getNodeKey(node));
            setSearchQuery('');
            setStatusFilter('ALL');
          }}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <NodeDistributionCard selectedNode={selectedNode} />

        <DataTable
          columns={columns}
          data={filteredExecutions}
          isLoading={Boolean(selectedNode) && studentsLoading && !students}
          fillHeight
          header={(
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="搜索姓名或工号"
                  className="w-48 sm:w-52"
                  inputClassName="h-8 rounded-lg text-xs"
                />
                <SegmentedControl
                  size="sm"
                  value={effectiveStatusFilter}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                  options={statusFilterOptions}
                />
              </div>
              <div className="shrink-0 text-xs text-text-muted">
                {isFiltering ? (
                  <>
                    筛选 <span className="font-semibold tabular-nums text-foreground">{filteredExecutions.length}</span> / 共{' '}
                    <span className="font-semibold tabular-nums text-foreground">{studentExecutions.length}</span> 人
                  </>
                ) : (
                  <>
                    共 <span className="font-semibold tabular-nums text-foreground">{studentExecutions.length}</span> 人
                  </>
                )}
              </div>
            </>
          )}
          className="mt-0"
          minHeight={220}
        />
      </div>
    </div>
  );
};

const MutedPlaceholder: React.FC = () => (
  <span className="flex h-5 items-center text-[13px] font-medium leading-5 text-text-muted">—</span>
);

const renderTimestampCell = (value: string | null) => (
  value
    ? <CellMutedTimestamp value={value} className="pt-px leading-5 tabular-nums" />
    : <MutedPlaceholder />
);

const TimeSpentCell: React.FC<{
  timeSpent: number | null;
  isAbnormal: boolean;
}> = ({ timeSpent, isAbnormal }) => {
  if (timeSpent === null) {
    return <MutedPlaceholder />;
  }

  const formatted = formatDuration(timeSpent);
  const rawHint = `${timeSpent} 分钟`;

  if (isAbnormal) {
    return (
      <span
        title={`考试用时低于参考时长 20%（${rawHint}）`}
        className="flex h-5 items-center gap-1.5 text-[13px] font-semibold leading-5 text-destructive tabular-nums whitespace-nowrap"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{formatted}</span>
      </span>
    );
  }

  return (
    <span
      title={timeSpent >= 60 ? rawHint : undefined}
      className="flex h-5 items-center text-[13px] font-medium leading-5 text-text-muted tabular-nums whitespace-nowrap"
    >
      {formatted}
    </span>
  );
};

const StatusDotLabel: React.FC<{
  dotClassName: string;
  label: string;
  textClassName?: string;
}> = ({ dotClassName, label, textClassName = 'text-foreground' }) => (
  <span className={cn('flex h-5 items-center gap-1.5 text-[13px] font-medium leading-5 whitespace-nowrap', textClassName)}>
    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClassName)} />
    <span>{label}</span>
  </span>
);

const ScoreCell: React.FC<{
  score: number | null;
  isPendingGrading?: boolean;
  isFailed?: boolean;
}> = ({ score, isPendingGrading = false, isFailed = false }) => {
  if (isPendingGrading) {
    return (
      <StatusDotLabel
        dotClassName={TASK_EXECUTION_STATUS_META.PENDING_GRADING.dotClassName}
        label="待批改"
        textClassName="text-warning-700"
      />
    );
  }
  if (score === null) {
    return <MutedPlaceholder />;
  }
  return (
    <span className="flex h-5 items-center gap-1.5 leading-5 tabular-nums whitespace-nowrap">
      <span
        className={cn(
          'inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full',
          isFailed ? 'bg-destructive/15' : 'bg-warning-500/20',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isFailed ? 'bg-destructive' : 'bg-warning-500',
          )}
        />
      </span>
      <span className="text-[13px] leading-5">
        <span className={cn(
          'font-semibold',
          isFailed ? 'text-destructive' : 'text-foreground',
        )}>
          {formatScore(score)}
        </span>{' '}
        <span className={cn(
          'font-normal',
          isFailed ? 'text-destructive/75' : 'text-text-muted',
        )}>
          分
        </span>
      </span>
    </span>
  );
};

const NodeSidebarPanel: React.FC<{
  nodes: TaskNodeProgress[];
  selectedNodeKey: string | null;
  onSelectNode: (node: TaskNodeProgress) => void;
}> = ({ nodes, selectedNodeKey, onSelectNode }) => (
  <Card className="flex h-full min-h-0 flex-col border border-border/70 p-4">
    <div className="mb-3 flex shrink-0 items-center justify-between">
      <p className="text-[13px] font-semibold text-foreground">任务节点</p>
      <span className="text-xs text-text-muted">共 {nodes.length} 项</span>
    </div>

    <ScrollContainer className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 max-h-72 xl:max-h-none">
      {nodes.map((node) => {
        const key = getNodeKey(node);
        const isSelected = key === selectedNodeKey;
        const meta = NODE_CATEGORY_META[node.category];
        return (
          <button
            key={key}
            type="button"
            title={`${node.completed_count}/${node.total_count} 人 (${node.percentage}%)`}
            onClick={() => onSelectNode(node)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors duration-150',
              isSelected
                ? 'border-primary-200 bg-primary-50/60'
                : 'border-transparent bg-muted/35 hover:bg-muted/60',
            )}
          >
            <IconBox
              icon={meta.icon}
              size="sm"
              bgColor={meta.bgClass}
              iconColor={meta.textClass}
              rounded="md"
              hoverScale={false}
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                isSelected ? 'font-semibold text-primary-700' : 'font-medium text-foreground',
              )}
            >
              {node.node_name}
            </span>
            <OverviewRing
              percent={node.percentage}
              strokeColor={node.percentage >= 100 ? 'var(--color-secondary)' : 'var(--color-primary)'}
              size={20}
              strokeWidth={3}
            />
          </button>
        );
      })}
      {nodes.length === 0 && (
        <p className="py-6 text-center text-sm text-text-muted">暂无任务节点</p>
      )}
    </ScrollContainer>
  </Card>
);
