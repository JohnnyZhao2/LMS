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
          className="rounded-md border-gray-300 data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
        />
      ),
      size: 60,
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRowKeys.includes(row.original.id)}
          onCheckedChange={() => toggleSelection(row.original.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="rounded-md border-gray-300 data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
        />
      ),
    },
    {
      id: 'title',
      header: '试卷信息',
      cell: ({ row }) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
            <Layout className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 line-clamp-1">{row.original.title}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: {row.original.id} • {row.original.created_by_name}</span>
          </div>
        </div>
      )
    },
    {
      id: 'metrics',
      header: '构成指标',
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-black text-gray-900 italic">{row.original.question_count} Qs</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Questions</span>
          </div>
          <div className="w-[1px] h-6 bg-gray-100" />
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary-600 italic">{row.original.total_score} Pts</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Score</span>
          </div>
        </div>
      )
    },
    {
      id: 'timestamp',
      header: '构建时间',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-700">{dayjs(row.original.created_at).format('YYYY.MM.DD')}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{dayjs(row.original.created_at).format('HH:mm:ss')}</span>
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
              className="h-9 px-4 rounded-xl bg-primary-500 text-white font-bold text-[11px] uppercase tracking-wider hover:bg-primary-600 shadow-lg shadow-primary-500/10"
              onClick={() => {
                setSelectedRowKeys([record.id]);
                setQuickPublishModalVisible(true);
              }}
            >
              <Send className="h-3.5 w-3.5 mr-2" />
              Publish
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-none shadow-premium animate-fadeIn">
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold cursor-pointer" onClick={() => navigate(`/test-center/quizzes/${record.id}/edit`)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> 编辑试卷
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold text-error-500 focus:bg-error-50 cursor-pointer" onClick={() => setDeleteId(record.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> 彻底删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 批量操作悬浮条 */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fadeInUp">
          <div className="bg-gray-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white font-black">
                {selectedRowKeys.length}
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Items Selected</span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <Button
              onClick={() => setQuickPublishModalVisible(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-black text-xs px-6"
            >
              快速发布新任务
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedRowKeys([])}
              className="text-gray-400 hover:text-white font-black text-xs"
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-hidden rounded-[1.5rem] border border-gray-100">
        {isLoading ? (
          <div className="p-10 space-y-5">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.results || []}
            className="border-none"
            rowClassName="hover:bg-primary-50/20 transition-colors cursor-pointer group"
            onRowClick={(row) => navigate(`/test-center/quizzes/${row.id}/edit`)}
          />
        )}
      </div>

      {/* 分页 */}
      {data && data.count > 0 && (
        <div className="flex justify-center mt-10">
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-premium border border-gray-50">
            <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900">{page}</span>
              <span className="text-gray-200">/</span>
              <span className="text-sm font-bold text-gray-400">{Math.ceil(data.count / 10)}</span>
            </div>
            <Button variant="ghost" size="icon" disabled={!data.next} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </div>
      )}

      {/* 快速发布确认弹窗 */}
      <Dialog open={quickPublishModalVisible} onOpenChange={setQuickPublishModalVisible}>
        <DialogContent className="rounded-[2.5rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-primary-50 text-primary-500 rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto">
              <Send className="w-10 h-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">确认批量发布？</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
              系统将为选中的 {selectedRowKeys.length} 份试卷各创建一个全新的学习任务。确认并继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setQuickPublishModalVisible(false)}>取消</Button>
            <Button className="flex-1 h-14 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-xl shadow-primary-500/20" onClick={handleQuickPublish}>
              立即发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-error-50 text-error-500 rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto">
              <Trash2 className="w-10 h-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">彻底移除此试卷？</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
              此操作将永久删除试卷及其所有数据映射，不可撤销。确认继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setDeleteId(null)}>取消</Button>
            <Button className="flex-1 h-14 rounded-2xl bg-error-500 hover:bg-error-600 text-white font-bold shadow-xl shadow-error-500/20" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizTab;
