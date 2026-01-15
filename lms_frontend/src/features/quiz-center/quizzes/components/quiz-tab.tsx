"use client"

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, MoreHorizontal, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuizzes } from '@/features/quiz-center/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quiz-center/quizzes/api/create-quiz';
import { ROUTES } from '@/config/routes';
import type { QuizListItem } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui';
import { DataTable, CellWithIcon, CellTags } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';

interface QuizTabProps {
  search?: string;
  quizType?: 'EXAM' | 'PRACTICE';
}

export const QuizTab: React.FC<QuizTabProps> = ({ search = '', quizType }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuizzes({ page, pageSize, search: search || undefined, quizType });
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [quizType, search]);

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
      cell: ({ row }) => (
        <CellWithIcon
          icon={<Layout className="w-5 h-5" />}
          title={row.original.title}
          subtitle={`ID: ${row.original.id} • ${row.original.created_by_name}`}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
        />
      )
    },
    {
      id: 'quiz_type',
      header: '类型',
      cell: ({ row }) => {
        const isExam = row.original.quiz_type === 'EXAM';
        return (
          <div className="flex flex-col gap-1.5">
            <CellTags
              tags={[{
                key: row.original.quiz_type,
                label: row.original.quiz_type_display || (isExam ? '考试' : '练习'),
                bg: isExam ? '#FEE2E2' : '#EFF6FF',
                color: isExam ? '#DC2626' : '#2563EB',
              }]}
            />
            {isExam && row.original.duration && (
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter px-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {row.original.duration}分钟 / 合格 {row.original.pass_score}
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'metrics',
      header: '构成指标',
      cell: ({ row }) => (
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#111827]">
              {row.original.question_count}
            </span>
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
              题量 (Q)
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-blue-600">
              {row.original.total_score}
            </span>
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
              总分 (P)
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'timestamp',
      header: '构建时间',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#111827]">
            {dayjs(row.original.created_at).format('YYYY.MM.DD')}
          </span>
          <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
            {dayjs(row.original.created_at).format('HH:mm:ss')}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md shadow-none">
                  <MoreHorizontal className="w-4 h-4 text-gray-500" strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg p-1 border border-gray-200 shadow-none bg-white">
                <DropdownMenuItem
                  className="rounded-md px-3 py-2.5 font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`${ROUTES.QUIZ_CENTER_QUIZZES}/${record.id}/edit`)}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> 编辑试卷
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 mx-2" />
                <DropdownMenuItem
                  className="rounded-md px-3 py-2.5 font-semibold text-red-600 focus:bg-red-50 cursor-pointer transition-colors"
                  onClick={() => setDeleteId(record.id)}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" strokeWidth={2} /> 彻底删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          onPageChange: (p: number) => setPage(p + 1),
          onPageSizeChange: (size: number) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        rowClassName="hover:bg-[#F3F4F6] transition-colors cursor-pointer group"
        onRowClick={(row: QuizListItem) => navigate(`${ROUTES.QUIZ_CENTER_QUIZZES}/${row.id}/edit`)}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="彻底移除此试卷？"
        description="此操作将永久删除该试卷及其所有数据映射，相关的历史成绩可能也会受到影响。该操作不可撤销。"
        icon={<Trash2 className="h-10 w-10" />}
        iconBgColor="bg-[#FEE2E2]"
        iconColor="text-[#DC2626]"
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
