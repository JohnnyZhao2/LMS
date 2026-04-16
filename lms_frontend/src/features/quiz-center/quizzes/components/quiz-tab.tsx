import React from 'react';
import { Eye, Pencil, Trash2, FileCheck, Clock3 } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import { useQuizzes } from '@/features/quiz-center/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quiz-center/quizzes/api/create-quiz';
import { ROUTES } from '@/config/routes';
import type { QuizListItem } from '@/types/quiz';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { Button } from '@/components/ui/button';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { DataTable } from '@/components/ui/data-table/data-table';
import { CellWithIcon, CellTags } from '@/components/ui/data-table/data-table-cells';
import { type ColumnDef } from '@tanstack/react-table';

interface QuizTabProps {
  search?: string;
  quizType?: 'EXAM' | 'PRACTICE';
}

export const QuizTab: React.FC<QuizTabProps> = ({ search = '', quizType }) => {
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const currentScopeKey = `${search}::${quizType ?? 'ALL'}`;
  const {
    page,
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
  } = useScopedPagination({ scopeKey: currentScopeKey });

  const { data, isLoading } = useQuizzes({ page, pageSize, search: search || undefined, quizType });
  const deleteQuiz = useDeleteQuiz();
  const { roleNavigate } = useRoleNavigate();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteQuiz.mutateAsync(deleteId);
      toast.success('试卷已从系统中清除');
      setDeleteId(null);
    } catch (error) {
      showApiError(error);
    }
  };

  const columns: ColumnDef<QuizListItem>[] = [
    {
      id: 'title',
      header: '试卷名称',
      minSize: 280,
      meta: {
        width: '28%',
        minWidth: '280px',
      },
      cell: ({ row }) => (
        <CellWithIcon
          icon={<FileCheck className="h-3.5 w-3.5" strokeWidth={1.8} />}
          title={row.original.title}
          iconBgClass="bg-muted/55"
          iconColorClass="text-foreground/60"
        />
      )
    },
    {
      id: 'quiz_type',
      header: '类型',
      minSize: 96,
      meta: {
        width: '10%',
        minWidth: '96px',
      },
      cell: ({ row }) => {
        const isExam = row.original.quiz_type === 'EXAM';
        return (
          <CellTags
            tags={[{
              key: row.original.quiz_type,
              label: row.original.quiz_type_display || (isExam ? '考试' : '测验'),
              textClass: isExam ? 'text-destructive-700' : 'text-primary-700',
              borderClass: isExam ? 'border-destructive-200' : 'border-primary-200',
            }]}
          />
        );
      }
    },
    {
      id: 'metrics',
      header: '核心指标',
      minSize: 260,
      meta: {
        width: '28%',
        minWidth: '260px',
      },
      cell: ({ row }) => {
        const isExam = row.original.quiz_type === 'EXAM';
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-foreground/85">
            <span className="whitespace-nowrap">
              <span className="text-text-muted">题量</span>
              <span className="ml-1 font-semibold text-foreground">{row.original.question_count}</span>
            </span>
            <span className="text-border">/</span>
            <span className="whitespace-nowrap">
              <span className="text-text-muted">总分</span>
              <span className="ml-1 font-semibold text-foreground">{row.original.total_score}</span>
            </span>
            <span className="text-border">/</span>
            <span className="whitespace-nowrap">
              <span className="text-text-muted">时长</span>
              <span className="ml-1 font-semibold text-foreground">{isExam && row.original.duration ? `${row.original.duration}min` : '-'}</span>
            </span>
            <span className="text-border">/</span>
            <span className="whitespace-nowrap">
              <span className="text-text-muted">及格线</span>
              <span className="ml-1 font-semibold text-foreground">{isExam ? (row.original.pass_score ?? '-') : '-'}</span>
            </span>
          </div>
        );
      }
    },
    {
      id: 'usage',
      header: '使用情况',
      minSize: 152,
      meta: {
        width: '14%',
        minWidth: '152px',
      },
      cell: ({ row }) => (
        <div className="text-sm font-medium text-foreground">
          {row.original.usage_count > 0 ? `已被 ${row.original.usage_count} 个任务使用` : '未被任务使用'}
        </div>
      ),
    },
    {
      id: 'timestamp',
      header: '更新时间',
      minSize: 148,
      meta: {
        width: '14%',
        minWidth: '148px',
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Clock3 className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.8} />
          <span className="text-sm font-medium text-foreground">
            {dayjs(row.original.updated_at).format('YYYY.MM.DD')}
          </span>
          <span className="text-[11px] font-medium text-text-muted">
            {dayjs(row.original.updated_at).format('HH:mm')}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      minSize: 108,
      meta: {
        width: '6%',
        minWidth: '108px',
      },
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="预览试卷">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-foreground hover:bg-muted"
                onClick={() => roleNavigate(`${ROUTES.QUIZZES}/${record.id}/preview`)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </Tooltip>

            <Tooltip title="编辑试卷">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                onClick={() => roleNavigate(`${ROUTES.QUIZZES}/${record.id}/edit`)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </Tooltip>

            <Tooltip title="删除试卷">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive-500 hover:text-destructive-700 hover:bg-destructive-50"
                onClick={() => setDeleteId(record.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.results || []}
        isLoading={isLoading}
        fillHeight
        pagination={{
          pageIndex,
          pageSize,
          defaultPageSize: 10,
          pageCount: Math.ceil((data?.count || 0) / pageSize),
          totalCount: data?.count || 0,
          onPageChange,
          onPageSizeChange,
        }}
        rowClassName="group"
        onRowClick={(row: QuizListItem) => roleNavigate(`${ROUTES.QUIZZES}/${row.id}/preview`)}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="彻底移除此试卷？"
        description="此操作将永久删除该试卷及其所有数据映射，相关的历史成绩可能也会受到影响。该操作不可撤销。"
        icon={<Trash2 className="h-10 w-10" />}
        iconBgColor="bg-destructive-100"
        iconColor="text-destructive"
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isConfirming={deleteQuiz.isPending}
      />
    </>
  );
};
