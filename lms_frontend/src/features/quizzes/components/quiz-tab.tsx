import React from 'react';
import { Pencil, Trash2, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedPagination } from '@/hooks/use-scoped-pagination';
import { useQuizzes } from '@/features/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quizzes/api/create-quiz';
import { ROUTES } from '@/config/routes';
import type { QuizListItem } from '@/types/quiz';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatScore } from '@/lib/score';
import { getLastEditedByName } from '@/lib/last-edited';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { DataTable } from '@/components/ui/data-table/data-table';
import {
  LIST_ACTION_ICON_DESTRUCTIVE_CLASS,
  LIST_ACTION_ICON_EDIT_CLASS,
} from '@/components/ui/data-table/action-icon-styles';
import { CellMutedTimestamp, CellReferenceTag, CellWithIcon } from '@/components/ui/data-table/data-table-cells';
import { type ColumnDef } from '@tanstack/react-table';

interface QuizTabProps {
  search?: string;
}

export const QuizTab: React.FC<QuizTabProps> = ({ search = '' }) => {
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const currentScopeKey = search;
  const {
    page,
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
  } = useScopedPagination({ scopeKey: currentScopeKey });

  const { data, isLoading } = useQuizzes({ page, pageSize, search: search || undefined });
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();

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
      meta: {
        width: '26%',
        minWidth: '260px',
      },
      cell: ({ row }) => (
        <CellWithIcon
          icon={<FileCheck className="h-3.5 w-3.5" strokeWidth={1.8} />}
          title={row.original.title}
          subtitle={getLastEditedByName(row.original.updated_by_name, row.original.created_by_name)}
          iconBgClass="bg-muted/55"
          iconColorClass="text-foreground/60"
        />
      )
    },
    {
      id: 'metrics',
      header: '核心指标',
      meta: {
        width: '24%',
        minWidth: '220px',
        maxWidth: '320px',
      },
      cell: ({ row }) => {
        const metricItems = [
          { key: 'question-count', label: '题量', value: String(row.original.question_count) },
          { key: 'total-score', label: '总分', value: formatScore(row.original.total_score) },
        ].filter((item) => item.value !== '');

        return (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-text-muted">
            {metricItems.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 ? <span className="text-border/80">/</span> : null}
                <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-[12px] font-medium text-text-muted">{item.label}</span>
                  <span className="text-[12px] font-medium text-text-muted">{item.value}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        );
      }
    },
    {
      id: 'usage',
      header: '引用次数',
      meta: {
        width: '96px',
      },
      cell: ({ row }) => (
        <CellReferenceTag count={row.original.usage_count} />
      ),
    },
    {
      id: 'timestamp',
      header: '更新时间',
      meta: {
        width: '168px',
      },
      cell: ({ row }) => (
        <CellMutedTimestamp value={row.original.updated_at} />
      ),
    },
    {
      id: 'actions',
      header: '操作',
      meta: {
        width: '88px',
      },
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="inline-flex flex-nowrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="编辑试卷">
              <Button
                variant="ghost"
                size="icon"
                className={LIST_ACTION_ICON_EDIT_CLASS}
                onClick={() => navigate(`${ROUTES.QUIZZES}/${record.id}/edit`)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </Tooltip>

            <Tooltip title="删除试卷">
              <Button
                variant="ghost"
                size="icon"
                className={LIST_ACTION_ICON_DESTRUCTIVE_CLASS}
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
        onRowClick={(row: QuizListItem) => navigate(`${ROUTES.QUIZZES}/${row.id}/preview`)}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="彻底移除此试卷？"
        description="此操作将删除当前试卷。题库题目、已创建任务和历史答卷都会保留。该操作不可撤销。"
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
