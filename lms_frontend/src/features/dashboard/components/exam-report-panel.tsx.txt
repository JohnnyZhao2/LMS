import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Download,
  Trophy,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table/data-table';
import { CellWithAvatar } from '@/components/ui/data-table/data-table-cells';
import { EmptyState } from '@/components/ui/empty-state';
import { ListTag } from '@/components/ui/list-tag';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/common/user-avatar';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import type {
  ExamReportDetailRow,
  ExamReportStudentRow,
  ExamReportView,
} from '@/features/dashboard/types/dashboard';

import { useExamReport } from '@/features/dashboard/api/exam-report';
import { ExamReportExportDialog } from '@/features/dashboard/components/exam-report-export-dialog';
import { VIEW_OPTIONS } from '@/features/dashboard/components/exam-report-view-meta';

const DEFAULT_PAGE_SIZE = 10;

/** 悬浮筛选条内控件：统一无边框、无聚焦高亮；13px 与表格次要文案一致，不抢列表主文 */
const FILTER_CONTROL_CLASS =
  'h-7 rounded-full border-0 bg-muted/45 text-[13px] shadow-none hover:border-0 focus:border-0 focus:bg-muted/45 focus:shadow-none focus-visible:ring-0 focus-visible:outline-none data-[state=open]:border-0 data-[state=open]:bg-muted/45 data-[state=open]:shadow-none';

const displayScore = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return formatScore(value) || '—';
};

const PassStatusTag: React.FC<{ status: string }> = ({ status }) => {
  const tone =
    status === '及格'
      ? 'bg-secondary-50 text-secondary'
      : status === '不及格'
        ? 'bg-error-50 text-error-700'
        : 'bg-muted/70 text-text-muted';

  return (
    <ListTag size="sm" className={cn('font-semibold', tone)}>
      {status}
    </ListTag>
  );
};

const StudentInfoCell: React.FC<{
  name: string;
  employeeId: string;
  departmentName?: string;
  avatarKey?: string;
}> = ({ name, employeeId, departmentName, avatarKey }) => (
  <CellWithAvatar
    name={name}
    subtitle={[employeeId, departmentName].filter(Boolean).join(' · ') || '—'}
    avatar={<UserAvatar avatarKey={avatarKey} name={name} size="md" />}
  />
);

const TimeSpentCell: React.FC<{ minutes: number | null }> = ({ minutes }) => (
  <span className="text-[13px] font-medium tabular-nums text-text-muted">
    {minutes == null ? '—' : `${minutes} 分钟`}
  </span>
);

const ScoreWithTotalCell: React.FC<{
  score: number | null;
  totalScore: number;
  bold?: boolean;
}> = ({ score, totalScore, bold }) => (
  <span
    className={cn(
      'text-sm tabular-nums text-foreground',
      bold ? 'font-bold' : 'font-semibold',
    )}
  >
    {displayScore(score)}
    <span className="ml-0.5 text-[11px] font-normal text-text-muted">
      /{displayScore(totalScore)}
    </span>
  </span>
);

const StatusTextCell: React.FC<{ text: string }> = ({ text }) => (
  <span className="text-[13px] font-medium text-text-muted">{text}</span>
);

const studentCol = (
  meta?: { minWidth?: string; width?: string },
): ColumnDef<ExamReportDetailRow> => ({
  id: 'student',
  header: '学员',
  meta: meta ?? { minWidth: '200px', width: '22%' },
  cell: ({ row }) => (
    <StudentInfoCell
      name={row.original.student_name}
      employeeId={row.original.employee_id}
      departmentName={row.original.department_name}
      avatarKey={row.original.avatar_key}
    />
  ),
});

const timeSpentCol = (): ColumnDef<ExamReportDetailRow> => ({
  id: 'time_spent',
  header: '考试用时',
  meta: { width: '96px' },
  cell: ({ row }) => <TimeSpentCell minutes={row.original.time_spent_minutes} />,
});

const scoreCol = (opts?: {
  width?: string;
  bold?: boolean;
}): ColumnDef<ExamReportDetailRow> => ({
  id: 'score',
  header: '成绩',
  meta: { width: opts?.width ?? '88px' },
  cell: ({ row }) => (
    <ScoreWithTotalCell
      score={row.original.score}
      totalScore={row.original.total_score}
      bold={opts?.bold}
    />
  ),
});

const passCol = (): ColumnDef<ExamReportDetailRow> => ({
  id: 'pass',
  header: '及格',
  meta: { width: '88px' },
  cell: ({ row }) => <PassStatusTag status={row.original.pass_status} />,
});

const statusCol = (): ColumnDef<ExamReportDetailRow> => ({
  id: 'status',
  header: '作答状态',
  meta: { width: '96px' },
  cell: ({ row }) => <StatusTextCell text={row.original.submission_status} />,
});

const rankCol = (emphasize?: boolean): ColumnDef<ExamReportDetailRow> => ({
  id: 'rank',
  header: '排名',
  meta: { width: '72px' },
  cell: ({ row }) =>
    emphasize ? (
      <span className="inline-flex min-w-8 items-center justify-center text-sm font-bold tabular-nums text-primary">
        {row.original.rank ?? '—'}
      </span>
    ) : (
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {row.original.rank ?? '—'}
      </span>
    ),
});

export const ExamReportPanel: React.FC = () => {
  const [view, setView] = React.useState<ExamReportView>('student');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [examId, setExamId] = React.useState<number | undefined>();
  const [studentId, setStudentId] = React.useState<number | undefined>();
  const [departmentId, setDepartmentId] = React.useState<number | undefined>();
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPageIndex(0);
  }, [view, examId, studentId, departmentId, debouncedSearch]);

  const filters = React.useMemo(
    () => ({
      view,
      examId,
      studentId,
      departmentId,
      search: debouncedSearch,
      page: pageIndex + 1,
      pageSize,
    }),
    [view, examId, studentId, departmentId, debouncedSearch, pageIndex, pageSize],
  );

  const { data, isLoading, isFetching, isPlaceholderData } = useExamReport(filters);
  // keepPreviousData 可能短暂保留上一视角数据，行数据必须与当前 view 对齐
  const reportData = data?.view === view ? data : undefined;

  React.useEffect(() => {
    if (view !== 'exam') return;
    if (examId) return;
    const first = data?.filters.exams[0];
    if (first) setExamId(first.id);
  }, [view, examId, data?.filters.exams]);

  const paginationConfig = React.useMemo(() => {
    const totalCount = reportData?.pagination.count ?? 0;
    const currentPageSize = reportData?.pagination.page_size ?? pageSize;
    return {
      pageIndex,
      pageSize: currentPageSize,
      defaultPageSize: DEFAULT_PAGE_SIZE,
      pageCount: Math.max(1, reportData?.pagination.total_pages ?? 1),
      totalCount,
      onPageChange: (page: number) => setPageIndex(page),
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPageIndex(0);
      },
    };
  }, [reportData?.pagination, pageIndex, pageSize]);

  const detailColumns = React.useMemo<ColumnDef<ExamReportDetailRow>[]>(
    () => [
      studentCol(),
      {
        id: 'exam',
        header: '考试',
        meta: { minWidth: '140px' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{row.original.exam_title}</p>
            <p className="truncate text-[11px] text-text-muted">{row.original.task_title}</p>
          </div>
        ),
      },
      rankCol(),
      timeSpentCol(),
      scoreCol(),
      passCol(),
      statusCol(),
    ],
    [],
  );

  const examColumns = React.useMemo<ColumnDef<ExamReportDetailRow>[]>(
    () => [
      rankCol(true),
      studentCol({ minWidth: '200px', width: '28%' }),
      timeSpentCol(),
      scoreCol({ width: '100px', bold: true }),
      passCol(),
      statusCol(),
    ],
    [],
  );

  const studentColumns = React.useMemo<ColumnDef<ExamReportStudentRow>[]>(() => {
    const exams = reportData?.exams ?? [];
    const base: ColumnDef<ExamReportStudentRow>[] = [
      {
        id: 'student',
        header: '学员',
        meta: { minWidth: '200px', width: '22%' },
        cell: ({ row }) => (
          <StudentInfoCell
            name={row.original.student_name}
            employeeId={row.original.employee_id}
            departmentName={row.original.department_name}
            avatarKey={row.original.avatar_key}
          />
        ),
      },
      {
        id: 'scored_count',
        header: '已考',
        meta: { width: '72px' },
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {row.original.scored_count}
          </span>
        ),
      },
      {
        id: 'average',
        header: '平均分',
        meta: { width: '88px' },
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {displayScore(row.original.average_score)}
          </span>
        ),
      },
      {
        id: 'pass_ratio',
        header: '及格场次',
        meta: { width: '96px' },
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {row.original.pass_ratio}
          </span>
        ),
      },
    ];

    exams.forEach((exam) => {
      base.push({
        id: `exam_${exam.id}`,
        header: () => (
          <span className="block max-w-28 truncate normal-case tracking-normal" title={exam.label}>
            {exam.exam_title}
          </span>
        ),
        meta: { minWidth: '96px' },
        cell: ({ row }) => {
          const score = row.original.exam_scores[String(exam.id)];
          const pass = row.original.exam_pass[String(exam.id)] ?? '未参加';
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {displayScore(score)}
              </span>
              <i
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  pass === '及格'
                    ? 'bg-secondary'
                    : pass === '不及格'
                      ? 'bg-destructive'
                      : 'bg-muted-foreground/40',
                )}
                title={pass}
              />
            </div>
          );
        },
      });
    });

    return base;
  }, [reportData?.exams]);

  const rows = reportData?.rows ?? [];
  const showExamEmpty = view === 'exam' && !examId && !(data?.filters.exams.length);
  const showExamPick = view === 'exam' && !examId && !!data?.filters.exams.length;

  // 仅无当前视角数据时用骨架；同视角筛选/翻页用 placeholder 保旧行，避免整表闪烁
  const showTableSkeleton = !reportData && (isLoading || isFetching);
  const tableSharedProps = {
    isLoading: showTableSkeleton,
    fillHeight: true,
    minHeight: 0 as const,
    className: cn(
      'mt-0 flex-1 transition-opacity',
      isFetching && isPlaceholderData && reportData && 'opacity-60',
    ),
    tableContainerClassName: 'border-0 rounded-none',
    shellClassName: 'border-0 shadow-none rounded-none',
    pagination: paginationConfig,
  };

  const activeColumns =
    view === 'student' ? studentColumns : view === 'exam' ? examColumns : detailColumns;

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border border-border p-0">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/40 px-5 py-2">
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as ExamReportView)}
          className="min-w-0 shrink-0"
        >
          <TabsList className="border-0">
            {VIEW_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="px-2.5 py-1.5 text-[13px]"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex h-7 w-10 shrink-0 items-center justify-end">
            {(Boolean(search.trim()) || Boolean(examId && view !== 'exam') || Boolean(studentId) || Boolean(departmentId)) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  if (view !== 'exam') setExamId(undefined);
                  setStudentId(undefined);
                  setDepartmentId(undefined);
                }}
                className="h-7 shrink-0 rounded-full px-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-muted hover:text-foreground"
              >
                清空
              </button>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-full border border-border/50 bg-white/94 px-2.5 py-1 shadow-[0_6px_18px_rgba(15,23,42,0.07),0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="搜索姓名/工号"
              className="w-36 min-w-0 sm:w-44"
              inputClassName={FILTER_CONTROL_CLASS}
            />
            <Select
              value={examId ? String(examId) : (view === 'exam' ? undefined : 'all')}
              onValueChange={(value) => setExamId(value === 'all' ? undefined : Number(value))}
            >
              <SelectTrigger className={cn(FILTER_CONTROL_CLASS, 'w-[9rem]')}>
                <SelectValue placeholder={view === 'exam' ? '选择考试' : '全部考试'} />
              </SelectTrigger>
              <SelectContent>
                {view !== 'exam' && <SelectItem value="all">全部考试</SelectItem>}
                {(data?.filters.exams ?? []).map((exam) => (
                  <SelectItem key={exam.id} value={String(exam.id)}>
                    {exam.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(data?.filters.departments.length ?? 0) > 1 && (
              <Select
                value={departmentId ? String(departmentId) : 'all'}
                onValueChange={(value) => setDepartmentId(value === 'all' ? undefined : Number(value))}
              >
                <SelectTrigger className={cn(FILTER_CONTROL_CLASS, 'w-28')}>
                  <SelectValue placeholder="全部部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部部门</SelectItem>
                  {(data?.filters.departments ?? []).map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={studentId ? String(studentId) : 'all'}
              onValueChange={(value) => setStudentId(value === 'all' ? undefined : Number(value))}
            >
              <SelectTrigger className={cn(FILTER_CONTROL_CLASS, 'w-32')}>
                <SelectValue placeholder="全部学员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部学员</SelectItem>
                {(data?.filters.students ?? []).map((student) => (
                  <SelectItem key={student.id} value={String(student.id)}>
                    {student.name}（{student.employee_id}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="mx-1 hidden h-4 w-px shrink-0 bg-border/70 sm:block" aria-hidden />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setExportDialogOpen(true)}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              导出
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {showTableSkeleton ? (
          <div className="flex min-h-0 flex-1 p-5">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        ) : showExamEmpty || showExamPick ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <EmptyState
              icon={Trophy}
              description={showExamEmpty ? '暂无考试数据' : '请选择一场考试查看排名与及格情况'}
              className="py-10"
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <EmptyState
              icon={Trophy}
              description="暂无符合条件的考试记录"
              className="py-10"
            />
          </div>
        ) : (
          <DataTable
            columns={activeColumns as ColumnDef<ExamReportDetailRow | ExamReportStudentRow, unknown>[]}
            data={rows as Array<ExamReportDetailRow | ExamReportStudentRow>}
            {...tableSharedProps}
          />
        )}
      </div>

      <ExamReportExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        view={view}
        filters={filters}
        columns={activeColumns as ColumnDef<ExamReportDetailRow | ExamReportStudentRow, unknown>[]}
        rows={rows as Array<ExamReportDetailRow | ExamReportStudentRow>}
        totalCount={reportData?.pagination.count ?? rows.length}
        isLoading={showTableSkeleton}
      />
    </Card>
  );
};
