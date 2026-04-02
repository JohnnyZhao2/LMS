import { useMemo } from 'react';
import { CalendarDays, ListChecks, Pencil, Star, Trash2, UserRound, UserRoundSearch } from 'lucide-react';

import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
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

const formatScore = (score: string | null) => {
  if (score === null) {
    return '--';
  }
  const value = Number(score);
  if (Number.isNaN(value)) {
    return '--';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

interface RecordHeaderActionsProps {
  score: number | null;
  scoreDisplay: string;
  canEditRecord: boolean;
  canDeleteRecord: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const RecordHeaderActions: React.FC<RecordHeaderActionsProps> = ({
  score,
  scoreDisplay,
  canEditRecord,
  canDeleteRecord,
  onEdit,
  onDelete,
}) => {
  if (!canEditRecord && !canDeleteRecord) {
    return (
      <div className="flex min-h-8 items-center justify-end">
        <span className="text-[12px] font-medium text-text-muted">综合得分</span>
        <span className={cn('ml-2.5 text-[20px] font-black leading-none tabular-nums', scoreTone(score))}>{scoreDisplay}</span>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-8 items-center"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="text-[12px] font-medium text-text-muted">综合得分</span>
      <span className={cn('ml-2.5 text-[20px] font-black leading-none tabular-nums', scoreTone(score))}>{scoreDisplay}</span>
      <div className="mx-3 h-6 w-px bg-border/80" />
      <div className="flex items-center gap-0.5">
        {canEditRecord ? (
          <Tooltip title="修改抽查">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-700"
              onClick={onEdit}
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
              className="h-8 w-8 rounded-lg text-destructive-500 hover:bg-destructive-50 hover:text-destructive-700"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
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
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

  if (!selectedStudent) {
    return (
      <div className="min-h-[36rem] overflow-hidden rounded-2xl border border-border/60 bg-background xl:max-h-full">
        <EmptyState
          icon={UserRoundSearch}
          description="请先在左侧选择一个学员，再查看该学员的抽查记录。"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[36rem] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background xl:max-h-full">
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

      <Spinner spinning={isLoading} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {records.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-5">
                {records.map((record) => {
                  const score = record.average_score === null ? null : Number(record.average_score);
                  const scoreDisplay = formatScore(record.average_score);
                  const canEditRecord = canUpdateSpotCheck && canManageRecord(record);
                  const canDeleteRecord = canDeleteSpotCheck && canManageRecord(record);

                  return (
                    <article
                      key={record.id}
                      className="mx-auto w-full max-w-[1240px] overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-foreground">
                          <div className="flex items-center gap-2 text-text-muted">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span className="font-medium">{dayjs(record.created_at).format('YYYY-MM-DD')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5 text-text-muted" />
                            <span className="text-text-muted">被查人:</span>
                            <span className="font-semibold text-primary-600">{record.student_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5 text-text-muted" />
                            <span className="text-text-muted">抽查人:</span>
                            <span className="font-semibold text-foreground">{record.checker_name}</span>
                          </div>
                        </div>

                        <RecordHeaderActions
                          score={score}
                          scoreDisplay={scoreDisplay}
                          canEditRecord={canEditRecord}
                          canDeleteRecord={canDeleteRecord}
                          onEdit={() => onEditRecord(record)}
                          onDelete={() => onDeleteRecord(record)}
                        />
                      </header>

                      <div className="space-y-3 p-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {record.items.map((item) => (
                            <section
                              key={`${record.id}-${item.id ?? item.order ?? item.topic}`}
                              className="rounded-xl bg-muted/45 p-3"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2.5">
                                <h3 className="line-clamp-2 text-[16px] font-semibold leading-[1.35] text-foreground">{item.topic}</h3>
                                <div className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-white px-2.5 py-1 text-[16px] font-black text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                                  <Star className="h-3 w-3 fill-warning text-warning" />
                                  {formatScore(item.score)}
                                </div>
                              </div>
                              <p className="text-[13px] leading-5 text-foreground/85">{item.comment}</p>
                            </section>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {totalPages > 1 || totalCount > 10 ? (
              <div className="border-t border-border/60 px-4 py-3">
                <Pagination
                  current={page}
                  total={totalCount}
                  pageSize={pageSize}
                  onChange={(nextPage) => onPageChange(nextPage)}
                  onShowSizeChange={(_, nextPageSize) => onPageSizeChange(nextPageSize)}
                  showSizeChanger
                  pageSizeOptions={[10, 20, 50]}
                  showTotal={(count, [start, end]) => `第 ${start}-${end} 条 / 共 ${count} 条`}
                />
              </div>
            ) : null}
          </div>
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
