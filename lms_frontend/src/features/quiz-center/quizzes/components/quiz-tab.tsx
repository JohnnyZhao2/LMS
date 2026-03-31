import React, { useState } from 'react';
import { Pencil, Trash2, Layout } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useQuizzes } from '@/features/quiz-center/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quiz-center/quizzes/api/create-quiz';
import { getQuestionTypeLabel } from '@/features/questions/constants';
import { ROUTES } from '@/config/routes';
import type { QuizListItem } from '@/types/api';
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
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    scopeKey: `${search}::${quizType ?? 'ALL'}`,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const currentScopeKey = `${search}::${quizType ?? 'ALL'}`;
  const page = pagination.scopeKey === currentScopeKey ? pagination.page : 1;
  const pageSize = pagination.pageSize;

  const { data, isLoading, refetch } = useQuizzes({ page, pageSize, search: search || undefined, quizType });
  const deleteQuiz = useDeleteQuiz();
  const { roleNavigate } = useRoleNavigate();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteQuiz.mutateAsync(deleteId);
      toast.success('试卷已从系统中清除');
      setDeleteId(null);
      refetch();
    } catch (error) {
      showApiError(error);
    }
  };

  const columns: ColumnDef<QuizListItem>[] = [
    {
      id: 'title',
      header: '试卷信息',
      minSize: 500,
      cell: ({ row }) => (
        <CellWithIcon
          icon={<Layout className="w-5 h-5" />}
          title={row.original.title}
          subtitle={row.original.updated_by_name || row.original.created_by_name}
          iconBgClass="bg-primary-50"
          iconColorClass="text-primary-600"
        />
      )
    },
    {
      id: 'quiz_type',
      header: '类型',
      size: 120,
      cell: ({ row }) => {
        const isExam = row.original.quiz_type === 'EXAM';
        return (
          <div className="flex items-center gap-2">
            <CellTags
              tags={[{
                key: row.original.quiz_type,
                label: row.original.quiz_type_display || (isExam ? '考试' : '练习'),
                bgClass: isExam ? 'bg-destructive-100' : 'bg-primary-50',
                textClass: isExam ? 'text-destructive' : 'text-primary-600',
              }]}
            />
            {isExam && row.original.duration && (
              <span className="text-[10px] font-medium text-text-muted whitespace-nowrap">
                {row.original.duration}min / {row.original.pass_score}分
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'metrics',
      header: '构成指标',
      size: 200,
      cell: ({ row }) => {
        const hasTypes = row.original.question_type_counts && Object.keys(row.original.question_type_counts).length > 0;

        return (
          <div className="flex items-center gap-3">
            {/* Primary Stats */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted border border-border">
                <span className="text-[10px] text-text-muted font-medium">题量</span>
                <span className="text-sm font-bold text-foreground">
                  {row.original.question_count}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-50/50 border border-primary-100/50">
                <span className="text-[10px] text-primary-500 font-medium">总分</span>
                <span className="text-sm font-bold text-primary-700">
                  {row.original.total_score}
                </span>
              </div>
            </div>

            {/* Type Breakdown */}
            {hasTypes && (
              <>
                <div className="h-3 w-px bg-muted shrink-0" />
                <div className="flex items-center gap-2">
                  {Object.entries(row.original.question_type_counts!).map(([type, count]) => {
                    let label = '单';
                    let colorClass = "text-text-muted bg-muted";

                    if (type === 'MULTIPLE_CHOICE') { label = '多'; colorClass = "text-secondary-600 bg-secondary-50"; }
                    if (type === 'TRUE_FALSE') { label = '判'; colorClass = "text-warning-600 bg-warning-50"; }
                    if (type === 'SHORT_ANSWER') { label = '简'; colorClass = "text-primary-600 bg-primary-50"; }

                    return (
                      <Tooltip
                        key={type}
                        title={`${getQuestionTypeLabel(type as import('@/types/api').QuestionType)}: ${count}题`}
                      >
                        <div className="flex items-center gap-1 cursor-help hover:opacity-80 transition-opacity">
                          <span className={`flex items-center justify-center w-4 h-4 rounded-[3px] text-[10px] font-medium ${colorClass}`}>
                            {label}
                          </span>
                          <span className="text-[11px] font-medium text-text-muted font-mono">
                            {count}
                          </span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      }
    },
    {
      id: 'timestamp',
      header: '更新时间',
      size: 100,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">
            {dayjs(row.original.updated_at).format('YYYY.MM.DD')}
          </span>
          <span className="text-[11px] font-medium text-text-muted">
            {dayjs(row.original.updated_at).format('HH:mm')}
          </span>
        </div>
      ),
    },
    {
      id: 'created_timestamp',
      header: '创建时间',
      size: 100,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">
            {dayjs(row.original.created_at).format('YYYY.MM.DD')}
          </span>
          <span className="text-[11px] font-medium text-text-muted">
            {dayjs(row.original.created_at).format('HH:mm')}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      size: 50,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
        pagination={{
          pageIndex: page - 1,
          pageSize: pageSize,
          pageCount: Math.ceil((data?.count || 0) / pageSize),
          totalCount: data?.count || 0,
          onPageChange: (p: number) =>
            setPagination((prev) => ({
              ...prev,
              page: p + 1,
              scopeKey: currentScopeKey,
            })),
          onPageSizeChange: (size: number) => {
            setPagination((prev) => ({
              ...prev,
              pageSize: size,
              page: 1,
              scopeKey: currentScopeKey,
            }));
          },
        }}
        rowClassName="hover:bg-muted transition-colors cursor-pointer group"
        onRowClick={(row: QuizListItem) => roleNavigate(`${ROUTES.QUIZZES}/${row.id}/edit`)}
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
        isConfirming={false} // deleteQuiz.isLoading could be used if available
      />
    </>
  );
};

export default QuizTab;
