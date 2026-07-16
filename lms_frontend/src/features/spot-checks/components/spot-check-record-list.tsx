import { CalendarDays, ListChecks, Trash2, UserRound, UserRoundSearch } from 'lucide-react';

import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListTag } from '@/components/ui/list-tag';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import dayjs from '@/lib/dayjs';
import type { SpotCheck, SpotCheckStudent } from '@/features/spot-checks/types/spot-check';
import { SPOT_CHECK_STATUS_META } from '@/features/spot-checks/constants/spot-check-status';
import { SpotCheckStarChip } from '@/features/spot-checks/components/spot-check-item-editor';

interface SpotCheckRecordListProps {
  selectedStudent: SpotCheckStudent | null;
  records: SpotCheck[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onEditRecord: (record: SpotCheck) => void;
  onDeleteRecord: (record: SpotCheck) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const SpotCheckRecordList: React.FC<SpotCheckRecordListProps> = ({
  selectedStudent,
  records,
  totalCount,
  page,
  pageSize,
  isLoading,
  onEditRecord,
  onDeleteRecord,
  onPageChange,
  onPageSizeChange,
}) => {
  const shouldShowPagination = totalCount > 0 && (totalCount > pageSize || pageSize !== 20);

  if (!selectedStudent) {
    return (
      <div className="min-h-[36rem] overflow-hidden rounded-xl border border-border/60 bg-background xl:max-h-full">
        <EmptyState
          icon={UserRoundSearch}
          description="请先在左侧选择一个学员，再查看该学员的抽查记录。"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[36rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-background xl:max-h-full">
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
            <ScrollContainer className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-5">
                {records.map((record) => (
                  <article
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onEditRecord(record)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onEditRecord(record);
                      }
                    }}
                    className="mx-auto w-full max-w-[1240px] cursor-pointer overflow-hidden rounded-xl border border-border/70 bg-background shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-colors hover:border-primary/25 hover:bg-primary/[0.015]"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-muted">
                        <ListTag size="xs" className={SPOT_CHECK_STATUS_META[record.status].className}>
                          {SPOT_CHECK_STATUS_META[record.status].label}
                        </ListTag>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span className="font-medium">{dayjs(record.created_at).format('YYYY-MM-DD')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5" />
                          <span>{record.checker_name}</span>
                        </div>
                      </div>

                      <div
                        className="flex min-h-8 items-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {record.status === 'SCORED' || record.average_score != null ? (
                          <SpotCheckStarChip value={record.average_score} />
                        ) : (
                          <span className="text-[12px] text-text-muted">
                            {record.status === 'PENDING' ? '待学员填写' : '待评分'}
                          </span>
                        )}
                        {record.actions.delete ? (
                          <>
                            <div className="mx-3 h-6 w-px bg-border/80" />
                            <Tooltip title="删除抽查">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive-500 hover:bg-destructive-50 hover:text-destructive-700"
                                onClick={() => onDeleteRecord(record)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </>
                        ) : null}
                      </div>
                    </header>

                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                      {record.items.map((item) => (
                        <section
                          key={`${record.id}-${item.id ?? item.order ?? item.topic}`}
                          className="relative min-h-[92px] rounded-xl bg-muted/45 p-3"
                        >
                          <h3 className="line-clamp-2 pr-16 text-[16px] font-semibold leading-[1.35] text-foreground">
                            {item.topic}
                          </h3>
                          {item.score != null && item.score !== '' ? (
                            <div className="absolute bottom-3 right-3">
                              <SpotCheckStarChip value={item.score} />
                            </div>
                          ) : null}
                        </section>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </ScrollContainer>

            {shouldShowPagination ? (
              <div className="border-t border-border/60 px-4 py-3">
                <Pagination
                  current={page}
                  total={totalCount}
                  pageSize={pageSize}
                  defaultPageSize={20}
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
            description="该学员还没有抽查记录，发起抽查后会出现在这里。"
          />
        )}
      </Spinner>
    </div>
  );
};
