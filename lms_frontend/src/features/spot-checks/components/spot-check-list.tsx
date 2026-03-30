import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Clock, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { CircleButton } from '@/components/ui/circle-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCurrentRole } from '@/hooks/use-current-role';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { isAdminLikeRole } from '@/lib/role-utils';
import type { SpotCheck } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { useDeleteSpotCheck } from '../api/create-spot-check';
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
  const [paginationByRole, setPaginationByRole] = useState<Record<string, { page: number; pageSize: number }>>({});
  const [deleteTarget, setDeleteTarget] = useState<SpotCheck | null>(null);
  const currentRole = useCurrentRole();
  const { user, hasPermission } = useAuth();
  const roleKey = currentRole ?? 'UNKNOWN';
  const { page, pageSize } = paginationByRole[roleKey] ?? { page: 1, pageSize: 20 };
  const setPagination = (next: { page?: number; pageSize?: number }) => {
    setPaginationByRole((prev) => ({
      ...prev,
      [roleKey]: {
        page: next.page ?? page,
        pageSize: next.pageSize ?? pageSize,
      },
    }));
  };
  const { data, isLoading } = useSpotChecks({ page, pageSize, role: currentRole });
  const deleteSpotCheck = useDeleteSpotCheck();
  const { roleNavigate } = useRoleNavigate();
  const canCreateSpotCheck = hasPermission('spot_check.create');
  const canUpdateSpotCheck = hasPermission('spot_check.update');
  const canDeleteSpotCheck = hasPermission('spot_check.delete');
  const shouldShowActions = canUpdateSpotCheck || canDeleteSpotCheck;

  const canManageRecord = (record: SpotCheck) =>
    isAdminLikeRole(currentRole) || record.checker === user?.id;

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteSpotCheck.mutateAsync(deleteTarget.id);
      toast.success('抽查记录已删除');
      setDeleteTarget(null);
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  const columns: ColumnDef<SpotCheck>[] = [
    {
      id: 'student_name',
      header: '被抽查学员',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarKey={record.student_avatar_key}
              name={record.student_name}
              size="md"
            />
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
            <UserAvatar
              avatarKey={record.checker_avatar_key}
              name={record.checker_name}
              size="sm"
            />
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

  if (shouldShowActions) {
    columns.push({
      id: 'actions',
      header: '操作',
      size: 120,
      cell: ({ row }) => {
        const record = row.original;
        const canEditRecord = canUpdateSpotCheck && canManageRecord(record);
        const canDeleteRecord = canDeleteSpotCheck && canManageRecord(record);

        if (!canEditRecord && !canDeleteRecord) {
          return <span className="text-sm text-text-muted">-</span>;
        }

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canEditRecord && (
              <Tooltip title="修改抽查">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                  onClick={() => roleNavigate(`${ROUTES.SPOT_CHECKS}/${record.id}/edit`)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </Tooltip>
            )}
            {canDeleteRecord && (
              <Tooltip title="删除抽查">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive-500 hover:text-destructive-700 hover:bg-destructive-50"
                  onClick={() => setDeleteTarget(record)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Tooltip>
            )}
          </div>
        );
      },
    });
  }

  return (
    <>
      <div className="flex flex-1 min-h-0 flex-col animate-fadeIn">
        <PageHeader
          title="抽查管理"
          icon={<Search className="w-5 h-5" />}
          extra={
            canCreateSpotCheck ? (
              <CircleButton
                onClick={() => roleNavigate(`${ROUTES.SPOT_CHECKS}/create`)}
                label="发起抽查"
              />
            ) : null
          }
        />

        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <Spinner spinning={isLoading} className="flex flex-1 min-h-0 flex-col">
            {data?.results && data.results.length > 0 ? (
              <div className="flex flex-1 min-h-0 flex-col">
                <DataTable
                  columns={columns}
                  data={data.results}
                  pagination={{
                    pageIndex: page - 1,
                    pageSize,
                    pageCount: Math.ceil((data.count || 0) / pageSize),
                    totalCount: data.count || 0,
                    onPageChange: (nextPage) => setPagination({ page: nextPage + 1 }),
                    onPageSizeChange: (nextPageSize) => setPagination({ page: 1, pageSize: nextPageSize }),
                  }}
                />
              </div>
            ) : (
              <EmptyState
                icon={Search}
                description="暂无抽查记录"
              >
                {canCreateSpotCheck ? (
                  <Button
                    onClick={() => roleNavigate(`${ROUTES.SPOT_CHECKS}/create`)}
                    className="bg-primary text-white hover:bg-primary-600 mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    发起第一次抽查
                  </Button>
                ) : null}
              </EmptyState>
            )}
          </Spinner>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="删除这条抽查记录？"
        description={`将永久删除学员「${deleteTarget?.student_name ?? ''}」的抽查记录，此操作不可撤销。`}
        icon={<Trash2 className="h-10 w-10" />}
        iconBgColor="bg-destructive-100"
        iconColor="text-destructive"
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isConfirming={deleteSpotCheck.isPending}
      />
    </>
  );
};

export default SpotCheckList;
