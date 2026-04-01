import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Clock3, ListChecks, Pencil, Trash2, UserRoundSearch } from 'lucide-react';

import { UserAvatar } from '@/components/common/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import type { SpotCheck, SpotCheckStudent } from '@/types/api';

interface SpotCheckRecordListProps {
  selectedStudent: SpotCheckStudent | null;
  records: SpotCheck[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  canUpdateSpotCheck: boolean;
  canDeleteSpotCheck: boolean;
  canManageRecord: (record: SpotCheck) => boolean;
  onEditRecord: (record: SpotCheck) => void;
  onDeleteRecord: (record: SpotCheck) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const scoreTone = (score: number | null) => {
  if (score === null || Number.isNaN(score)) {
    return 'text-text-muted';
  }
  if (score >= 85) {
    return 'text-secondary';
  }
  if (score >= 60) {
    return 'text-warning';
  }
  return 'text-destructive';
};

export const SpotCheckRecordList: React.FC<SpotCheckRecordListProps> = ({
  selectedStudent,
  records,
  totalCount,
  page,
  pageSize,
  isLoading,
  canUpdateSpotCheck,
  canDeleteSpotCheck,
  canManageRecord,
  onEditRecord,
  onDeleteRecord,
  onPageChange,
  onPageSizeChange,
}) => {
  const shouldShowActions = canUpdateSpotCheck || canDeleteSpotCheck;

  const columns = useMemo<ColumnDef<SpotCheck>[]>(() => {
    const baseColumns: ColumnDef<SpotCheck>[] = [
      {
        id: 'topic_summary',
        header: '主题摘要',
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="space-y-2">
              <Tooltip title={record.topic_summary}>
                <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground">{record.topic_summary}</p>
              </Tooltip>
              <Badge variant="secondary" className="w-fit">
                {record.topic_count} 个主题
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'average_score',
        header: '均分',
        size: 130,
        cell: ({ row }) => {
          const score = row.original.average_score === null ? null : Number(row.original.average_score);
          return (
            <div className="space-y-1">
              <p className={cn('text-xl font-black tabular-nums', scoreTone(score))}>
                {row.original.average_score ?? '--'}
              </p>
              <p className="text-xs text-text-muted">主题均分</p>
            </div>
          );
        },
      },
      {
        id: 'checker',
        header: '抽查人',
        size: 180,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <UserAvatar avatarKey={row.original.checker_avatar_key} name={row.original.checker_name} size="sm" />
            <span className="truncate text-sm text-foreground">{row.original.checker_name}</span>
          </div>
        ),
      },
      {
        id: 'created_at',
        header: '记录时间',
        size: 190,
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{dayjs(row.original.created_at).format('YYYY-MM-DD HH:mm')}</span>
            </div>
            <p className="text-xs text-text-muted">系统记录时间</p>
          </div>
        ),
      },
    ];

    if (!shouldShowActions) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        id: 'actions',
        header: '操作',
        size: 110,
        cell: ({ row }) => {
          const record = row.original;
          const canEditRecord = canUpdateSpotCheck && canManageRecord(record);
          const canDeleteRecord = canDeleteSpotCheck && canManageRecord(record);

          if (!canEditRecord && !canDeleteRecord) {
            return <span className="text-sm text-text-muted">-</span>;
          }

          return (
            <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
              {canEditRecord ? (
                <Tooltip title="修改抽查">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                    onClick={() => onEditRecord(record)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Tooltip>
              ) : null}
              {canDeleteRecord ? (
                <Tooltip title="删除抽查">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive-500 hover:bg-destructive-50 hover:text-destructive-700"
                    onClick={() => onDeleteRecord(record)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              ) : null}
            </div>
          );
        },
      },
    ];
  }, [
    canDeleteSpotCheck,
    canManageRecord,
    canUpdateSpotCheck,
    onDeleteRecord,
    onEditRecord,
    shouldShowActions,
  ]);

  if (!selectedStudent) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <EmptyState
          icon={UserRoundSearch}
          description="请先在左侧选择一个学员，再查看该学员的抽查记录。"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
      <div className="flex min-h-16 items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            avatarKey={selectedStudent.avatar_key}
            name={selectedStudent.username}
            size="md"
            className="h-10 w-10 shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">{selectedStudent.username}</p>
            <p className="truncate text-[12px] text-text-muted">
              {selectedStudent.employee_id || '未填写工号'}
              {selectedStudent.department_name ? ` · ${selectedStudent.department_name}` : ''}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-muted px-2.5 py-1 text-[12px] font-medium text-text-muted">
          共 {totalCount} 条
        </div>
      </div>

      <Spinner spinning={isLoading} className="flex min-h-[24rem] flex-col">
        {records.length > 0 ? (
          <DataTable
            columns={columns}
            data={records}
            pagination={{
              pageIndex: page - 1,
              pageSize,
              pageCount: Math.ceil(totalCount / pageSize),
              totalCount,
              onPageChange: (nextPage) => onPageChange(nextPage + 1),
              onPageSizeChange: (nextPageSize) => onPageSizeChange(nextPageSize),
            }}
          />
        ) : (
          <EmptyState
            icon={ListChecks}
            description="该学员还没有抽查记录，完成一次抽查后会在这里展示。"
          />
        )}
      </Spinner>
    </div>
  );
};
