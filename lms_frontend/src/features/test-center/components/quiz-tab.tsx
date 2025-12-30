import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuizzes } from '@/features/quizzes/api/get-quizzes';
import { useDeleteQuiz } from '@/features/quizzes/api/create-quiz';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { QuizListItem } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import { type ColumnDef } from '@tanstack/react-table';

interface QuizTabProps {
  onQuickPublish: (quizIds: number[]) => void;
  search?: string;
}

/**
 * 试卷管理标签页 - ShadCN UI 版本
 * 支持多选和快速发布功能
 */
export const QuizTab: React.FC<QuizTabProps> = ({ onQuickPublish, search = '' }) => {
  const [page, setPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [quickPublishModalVisible, setQuickPublishModalVisible] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; quizId?: number }>({ open: false });

  const { data, isLoading } = useQuizzes({ page, search: search || undefined });
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();

  /**
   * 检查是否有编辑/删除权限
   */
  const canEdit = (record: QuizListItem): boolean => {
    if (currentRole === 'ADMIN') return true;
    return record.created_by === user?.id;
  };

  const handleDelete = async () => {
    if (!deleteDialog.quizId) return;
    try {
      await deleteQuiz.mutateAsync(deleteDialog.quizId);
      toast.success('删除成功');
      setDeleteDialog({ open: false });
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  /**
   * 快速发布
   */
  const handleQuickPublish = async () => {
    setQuickPublishModalVisible(false);
    onQuickPublish(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  /**
   * 切换选中状态
   */
  const toggleSelection = (id: number) => {
    setSelectedRowKeys(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  /**
   * 全选/取消全选
   */
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
        />
      ),
      size: 40,
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRowKeys.includes(row.original.id)}
          onCheckedChange={() => toggleSelection(row.original.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'title',
      header: '试卷名称',
      accessorKey: 'title',
    },
    {
      id: 'question_count',
      header: '题目数量',
      accessorKey: 'question_count',
      size: 100,
    },
    {
      id: 'total_score',
      header: '总分',
      accessorKey: 'total_score',
      size: 80,
    },
    {
      id: 'created_by_name',
      header: '创建人',
      accessorKey: 'created_by_name',
      size: 100,
    },
    {
      id: 'created_at',
      header: '创建时间',
      size: 120,
      cell: ({ row }) => dayjs(row.original.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      id: 'action',
      header: '操作',
      size: 200,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="link"
              size="sm"
              className="h-8 px-2 text-primary-500"
              onClick={() => {
                setSelectedRowKeys([record.id]);
                setQuickPublishModalVisible(true);
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              发布任务
            </Button>
            {canEdit(record) && (
              <>
                <Button
                  variant="link"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => navigate(`/test-center/quizzes/${record.id}/edit`)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="h-8 px-2 text-red-500 hover:text-red-600"
                  onClick={() => setDeleteDialog({ open: true, quizId: record.id })}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  删除
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        {/* 工具栏 */}
        {selectedRowKeys.length > 0 && (
          <div className="mb-4">
            <Button onClick={() => setQuickPublishModalVisible(true)}>
              <Send className="h-4 w-4 mr-2" />
              快速发布 ({selectedRowKeys.length})
            </Button>
          </div>
        )}

        {/* 试卷表格 */}
        <Spinner spinning={isLoading}>
          <DataTable
            columns={columns}
            data={data?.results || []}
          />
          {/* 分页 */}
          {data && data.count > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                共 {data.count} 条
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.next}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Spinner>
      </CardContent>

      {/* 快速发布弹窗 */}
      <Dialog open={quickPublishModalVisible} onOpenChange={setQuickPublishModalVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认发布任务</DialogTitle>
            <DialogDescription>
              确认将选中的 {selectedRowKeys.length} 份试卷发布为新任务吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setQuickPublishModalVisible(false)}>
              取消
            </Button>
            <Button onClick={handleQuickPublish}>
              确认发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后无法恢复，确定要删除这个试卷吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteQuiz.isPending}
            >
              {deleteQuiz.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuizTab;
