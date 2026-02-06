import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Clock, Plus, Search, Star, User } from 'lucide-react';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { AvatarCircle } from '@/components/common/avatar-circle';
import { ROUTES } from '@/config/routes';
import { useCurrentRole } from '@/hooks/use-current-role';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { SpotCheck } from '@/types/api';
import { useSpotChecks } from '../api/get-spot-checks';

/**
 * 星级评分组件
 */
const StarRating: React.FC<{ value: number; max?: number }> = ({ value, max = 5 }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < value ? 'fill-warning-400 text-warning-400' : 'text-text-muted'}`}
        />
      ))}
    </div>
  );
};

/**
 * 抽查记录列表组件 - ShadCN UI 版本
 */
export const SpotCheckList: React.FC = () => {
  const [pageByRole, setPageByRole] = useState<Record<string, number>>({});
  const currentRole = useCurrentRole();
  const roleKey = currentRole ?? 'UNKNOWN';
  const page = pageByRole[roleKey] ?? 1;
  const setPage = (nextPage: number) => {
    setPageByRole((prev) => ({
      ...prev,
      [roleKey]: nextPage,
    }));
  };
  const { data, isLoading } = useSpotChecks({ page, role: currentRole });
  const { roleNavigate } = useRoleNavigate();

  const columns: ColumnDef<SpotCheck>[] = [
    {
      id: 'student_name',
      header: '被抽查学员',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-3">
            <AvatarCircle size="md" text={record.student_name?.charAt(0)}>
              {!record.student_name && <User className="w-4 h-4" />}
            </AvatarCircle>
            <span className="font-semibold text-foreground">{record.student_name}</span>
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
        const scoreClassName = scoreNum >= 80 ? 'text-secondary' : scoreNum >= 60 ? 'text-warning' : 'text-destructive';
        return (
          <div className="flex items-center gap-2">
            <StarRating value={stars} />
            <span className={cn('font-semibold', scoreClassName)}>
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
            <AvatarCircle size="sm" variant="secondary">
              <User className="w-3 h-3" />
            </AvatarCircle>
            <span className="text-foreground">{record.checker_name}</span>
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
          <div className="flex items-center gap-2 text-text-muted">
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
        icon={<Search className="w-5 h-5" />}
        extra={
          <Button
            onClick={() => roleNavigate(`${ROUTES.SPOT_CHECKS}/create`)}
            className="h-14 px-8 rounded-md bg-primary hover:bg-primary-600 text-white font-semibold hover:scale-105 transition-all duration-200"
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
                <SimplePagination
                  currentPage={page}
                  hasNext={!!data.next}
                  totalCount={data.count || 0}
                  countLabel="条抽查记录"
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <EmptyState
                icon={Search}
                description="暂无抽查记录"
              >
                <Button
                  onClick={() => roleNavigate(`${ROUTES.SPOT_CHECKS}/create`)}
                  className="bg-primary text-white hover:bg-primary-600 mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  发起第一次抽查
                </Button>
              </EmptyState>
            )}
          </Spinner>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpotCheckList;
