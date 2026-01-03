import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Pencil, User, FileText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePendingGrading } from '../api/get-pending-grading';
import { ROUTES } from '@/config/routes';
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
export const GradingList: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingGrading({ page });
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
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-[#3B82F6]"
            >
              {record.user_name?.charAt(0) || <User className="w-4 h-4" />}
            </div>
            <span className="font-semibold text-[#111827]">{record.user_name}</span>
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
            <FileText className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-[#111827]">{record.quiz_title}</span>
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
          <div className="flex items-center gap-2 text-[#6B7280]">
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
            onClick={() => navigate(`${ROUTES.GRADING}/${record.submission}`)}
            className="font-semibold rounded-md bg-[#3B82F6] text-white hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 shadow-none"
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

      <Card className="shadow-none">
        <CardContent className="p-6">
          <Spinner spinning={isLoading}>
            {data?.results && data.results.length > 0 ? (
              <div>
                <DataTable
                  columns={columns}
                  data={data.results}
                />
                {/* 分页 */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E7EB]">
                  <span className="text-sm text-[#6B7280]">
                    共 {data.count || 0} 份待评分
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="shadow-none border-4 border-[#E5E7EB]"
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.next}
                      onClick={() => setPage(page + 1)}
                      className="shadow-none border-4 border-[#E5E7EB]"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#6B7280]">
                <FileText className="w-12 h-12 text-[#9CA3AF] mb-4" />
                <span className="text-base">暂无待评分答卷</span>
              </div>
            )}
          </Spinner>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradingList;
