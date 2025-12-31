"use client"

import React, { useState } from 'react';
import { Pencil, Trash2, Send, FileText, CheckCircle2, ChevronLeft, ChevronRight, MoreHorizontal, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuizzes } from '@/features/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quizzes/api/create-quiz';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { QuizListItem } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table/data-table';
import { Skeleton } from '@/components/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface QuizTabProps {
  onQuickPublish: (quizIds: number[]) => void;
  search?: string;
}

export const QuizTab: React.FC<QuizTabProps> = ({ onQuickPublish, search = '' }) => {
  const [page, setPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [quickPublishModalVisible, setQuickPublishModalVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuizzes({ page, search: search || undefined });
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  const canEdit = (record: QuizListItem): boolean => {
    if (currentRole === 'ADMIN') return true;
    return record.created_by === user?.id;
  };

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

  const handleQuickPublish = async () => {
    setQuickPublishModalVisible(false);
    onQuickPublish(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  const toggleSelection = (id: number) => {
    setSelectedRowKeys(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!data?.results) return;
    if (selectedRowKeys.length === data.results.length) {
      setSelectedRowKeys([]);
    } else {
      setSelectedRowKeys(data.results.map(q => q.id));
    }
  };

  const columns: ColumnDef<QuizListItem>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={data?.results && data.results.length > 0 && selectedRowKeys.length === data.results.length}
          onCheckedChange={toggleSelectAll}
          className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shadow-none"
        />
      ),
      size: 60,
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRowKeys.includes(row.original.id)}
          onCheckedChange={() => toggleSelection(row.original.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shadow-none"
        />
      ),
    },
    {
      id: 'title',
      header: '试卷信息',
      cell: ({ row }) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-none">
            <Layout className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 line-clamp-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {row.original.title}
            </span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              ID: {row.original.id} • {row.original.created_by_name}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'quiz_type',
      header: '类型',
      cell: ({ row }) => {
        const isExam = row.original.quiz_type === 'EXAM';
        return (
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
                isExam
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-blue-600"
              )}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {row.original.quiz_type_display || (isExam ? '考试' : '练习')}
            </span>
            {isExam && row.original.duration && (
              <span className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {row.original.duration}分钟 / 及格{row.original.pass_score}分
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
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {row.original.question_count} Qs
            </span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Questions
            </span>
          </div>
          <div className="w-[1px] h-6 bg-gray-200" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-blue-600" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {row.original.total_score} Pts
            </span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Total Score
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
          <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {dayjs(row.original.created_at).format('YYYY.MM.DD')}
          </span>
          <span className="text-[10px] font-semibold text-gray-500 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
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
            <Button
              className="h-9 px-4 rounded-md bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider hover:bg-blue-700 shadow-none hover:scale-105 transition-all duration-200"
              onClick={() => {
                setSelectedRowKeys([record.id]);
                setQuickPublishModalVisible(true);
              }}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <Send className="h-3.5 w-3.5 mr-2" strokeWidth={2} />
              Publish
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md shadow-none">
                  <MoreHorizontal className="w-4 h-4 text-gray-500" strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg p-2 border-2 border-gray-200 shadow-none bg-white">
                <DropdownMenuItem
                  className="rounded-md px-3 py-2.5 font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/test-center/quizzes/${record.id}/edit`)}
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
    <div className="space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 批量操作悬浮条 */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-8 py-4 rounded-lg shadow-none flex items-center gap-8 border-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold shadow-none">
                {selectedRowKeys.length}
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Items Selected</span>
            </div>
            <div className="w-[1px] h-8 bg-white/20" />
            <Button
              onClick={() => setQuickPublishModalVisible(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs px-6 shadow-none hover:scale-105 transition-all duration-200"
            >
              快速发布新任务
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedRowKeys([])}
              className="text-gray-300 hover:text-white font-bold text-xs shadow-none"
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-hidden rounded-lg border-2 border-gray-200 bg-white shadow-none">
        {isLoading ? (
          <div className="p-10 space-y-5">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.results || []}
            className="border-none"
            rowClassName="hover:bg-blue-50 transition-colors cursor-pointer group"
            onRowClick={(row) => navigate(`/test-center/quizzes/${row.id}/edit`)}
          />
        )}
      </div>

      {/* 分页 */}
      {data && data.count > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-none border-2 border-gray-200">
            <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)} className="shadow-none">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>{page}</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-semibold text-gray-500" style={{ fontFamily: "'Outfit', sans-serif" }}>{Math.ceil(data.count / 10)}</span>
            </div>
            <Button variant="ghost" size="icon" disabled={!data.next} onClick={() => setPage(page + 1)} className="shadow-none">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </div>
      )}

      {/* 快速发布确认弹窗 */}
      <Dialog open={quickPublishModalVisible} onOpenChange={setQuickPublishModalVisible}>
        <DialogContent className="rounded-lg max-w-md p-10 border-2 border-gray-200 shadow-none bg-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <DialogHeader>
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-8 mx-auto shadow-none">
              <Send className="w-10 h-10" strokeWidth={2} />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 text-center" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              确认批量发布？
            </DialogTitle>
            <DialogDescription className="text-gray-600 font-semibold text-center leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
              系统将为选中的 {selectedRowKeys.length} 份试卷各创建一个全新的学习任务。确认并继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button
              variant="ghost"
              className="flex-1 h-14 rounded-md font-bold shadow-none"
              onClick={() => setQuickPublishModalVisible(false)}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              取消
            </Button>
            <Button
              className="flex-1 h-14 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-none hover:scale-105 transition-all duration-200"
              onClick={handleQuickPublish}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              立即发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-lg max-w-md p-10 border-2 border-gray-200 shadow-none bg-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <DialogHeader>
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-8 mx-auto shadow-none">
              <Trash2 className="w-10 h-10" strokeWidth={2} />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 text-center" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              彻底移除此试卷？
            </DialogTitle>
            <DialogDescription className="text-gray-600 font-semibold text-center leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
              此操作将永久删除试卷及其所有数据映射，不可撤销。确认继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button
              variant="ghost"
              className="flex-1 h-14 rounded-md font-bold shadow-none"
              onClick={() => setDeleteId(null)}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              取消
            </Button>
            <Button
              className="flex-1 h-14 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold shadow-none hover:scale-105 transition-all duration-200"
              onClick={handleDelete}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizTab;
