import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { Plus, Search, User, Clock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpotChecks } from '../api/get-spot-checks';
import { PageHeader } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import type { SpotCheck } from '@/types/api';
import dayjs from '@/lib/dayjs';

/**
 * 星级评分组件
 */
const StarRating: React.FC<{ value: number; max?: number }> = ({ value, max = 5 }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};

/**
 * 抽查记录列表组件 - ShadCN UI 版本
 */
export const SpotCheckList: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSpotChecks(page);
  const navigate = useNavigate();

  const columns: ColumnDef<SpotCheck>[] = [
    {
      id: 'student_name',
      header: '被抽查学员',
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
              {record.student_name?.charAt(0) || <User className="w-4 h-4" />}
            </div>
            <span className="font-semibold">{record.student_name}</span>
          </div>
        );
      },
    },
    {
      id: 'content',
      header: '抽查内容',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <Tooltip title={record.content}>
            <span className="block max-w-75 truncate">{record.content}</span>
          </Tooltip>
        );
      },
    },
    {
      id: 'score',
      header: '评分',
      size: 150,
      cell: ({ row }) => {
        const record = row.original;
        const scoreNum = Number(record.score);
        const stars = Math.round(scoreNum / 20);
        const scoreColor = scoreNum >= 80 ? 'var(--color-success-500)' : scoreNum >= 60 ? 'var(--color-warning-500)' : 'var(--color-error-500)';
        return (
          <div className="flex items-center gap-2">
            <StarRating value={stars} />
            <span className="font-semibold" style={{ color: scoreColor }}>
              {record.score}
            </span>
          </div>
        );
      },
    },
    {
      id: 'checker_name',
      header: '抽查人',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{
                background: 'var(--color-success-50)',
                color: 'var(--color-success-500)',
              }}
            >
              <User className="w-3 h-3" />
            </div>
            <span>{record.checker_name}</span>
          </div>
        );
      },
    },
    {
      id: 'checked_at',
      header: '抽查时间',
      size: 180,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{dayjs(record.checked_at).format('YYYY-MM-DD HH:mm')}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="抽查中心"
        subtitle="对学员进行知识抽查，记录和追踪抽查结果"
        icon={<Search className="w-5 h-5" />}
        extra={
          <Button
            onClick={() => navigate('/spot-checks/create')}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-error-500 to-pink-500 hover:from-error-600 hover:to-pink-600 text-white font-bold shadow-md shadow-error-500/20 hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-2" />
            发起抽查
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <Spinner spinning={isLoading}>
            {data?.results && data.results.length > 0 ? (
              <div>
                <DataTable
                  columns={columns}
                  data={data.results}
                />
                {/* 分页 */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    共 {data.count || 0} 条抽查记录
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
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <span className="text-base mb-4">暂无抽查记录</span>
                <Button onClick={() => navigate('/spot-checks/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  发起第一次抽查
                </Button>
              </div>
            )}
          </Spinner>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpotCheckList;
