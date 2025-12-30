import { useState } from 'react';
import { Spin } from 'antd';
import { Pencil, User, FileText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePendingGrading } from '../api/get-pending-grading';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import type { GradingList as GradingListType } from '@/types/api';
import dayjs from '@/lib/dayjs';

/**
 * 待评分列表组件 - ShadCN UI 版本
 */
export const GradingListNew: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingGrading(page);
  const navigate = useNavigate();

  const columns: ColumnDef<GradingListType>[] = [
    {
      id: 'user_name',
      header: '学员',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
              }}
            >
              {record.user_name?.charAt(0) || <User className="w-4 h-4" />}
            </div>
            <span className="font-semibold">{record.user_name}</span>
          </div>
        );
      },
    },
    {
      id: 'quiz_title',
      header: '试卷',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            <span>{record.quiz_title}</span>
          </div>
        );
      },
    },
    {
      id: 'task_title',
      header: '任务',
      accessorKey: 'task_title',
    },
    {
      id: 'submitted_at',
      header: '提交时间',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{record.submitted_at ? dayjs(record.submitted_at).format('YYYY-MM-DD HH:mm') : '-'}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: '状态',
      cell: () => (
        <StatusBadge status="pending" text="待评分" size="small" />
      ),
    },
    {
      id: 'action',
      header: '操作',
      size: 120,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <Button
            onClick={() => navigate(`/grading/${record.submission}`)}
            className="font-semibold rounded-md"
          >
            <Pencil className="w-4 h-4 mr-2" />
            评分
          </Button>
        );
      },
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="评分中心"
        subtitle="查看待评分的答卷并进行评分"
        icon={<Pencil className="w-5 h-5" />}
      />

      <Card>
        <CardContent className="p-6">
          <Spin spinning={isLoading}>
            {data?.results && data.results.length > 0 ? (
              <div>
                <DataTable
                  columns={columns}
                  data={data.results}
                />
                {/* 分页 */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    共 {data.count || 0} 份待评分
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <span className="text-base">暂无待评分答卷</span>
              </div>
            )}
          </Spin>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradingListNew;
