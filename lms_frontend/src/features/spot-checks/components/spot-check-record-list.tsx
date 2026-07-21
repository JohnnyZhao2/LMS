import { CalendarDays, ListChecks, Trash2, UserRound } from 'lucide-react';

import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListTag } from '@/components/ui/list-tag';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import dayjs from '@/lib/dayjs';
import type {
  SpotCheck,
  SpotCheckStudent,
} from '@/features/spot-checks/types/spot-check';
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

const getRecordStatusLabel = (status: SpotCheck['status']) =>
  status === 'SUBMITTED' ? '待评分' : SPOT_CHECK_STATUS_META[status].label;

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
  const shouldShowPagination =
    totalCount > 0 && (totalCount > pageSize || pageSize !== 20);

  return (
    <div className="border-border/60 bg-background flex min-h-[36rem] flex-col overflow-hidden rounded-xl border xl:max-h-full">
      <div className="border-border/60 border-b px-5">
        <div className="flex h-14 items-center">
          {selectedStudent ? (
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  avatarKey={selectedStudent.avatar_key}
                  name={selectedStudent.username}
                  size="md"
                  className="h-8 w-8 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-foreground truncate text-[14px] font-semibold">
                    {selectedStudent.username}
                  </p>
                  <p className="text-text-muted truncate text-[12px]">
                    {selectedStudent.employee_id || '未填写工号'}
                    {selectedStudent.department_name
                      ? ` · ${selectedStudent.department_name}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <SpotCheckStarChip value={selectedStudent.average_score} />
              </div>
            </div>
          ) : (
            <div className="text-primary inline-flex h-full items-center text-[13px] font-semibold">
              全部
              <span className="bg-primary-50 text-primary ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
                {totalCount}
              </span>
            </div>
          )}
        </div>
      </div>
      <Spinner
        spinning={isLoading}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
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
                    className="group/record border-border/70 bg-background hover:border-primary/25 hover:bg-primary/[0.015] mx-auto w-full max-w-[1240px] cursor-pointer overflow-hidden rounded-xl border shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-colors"
                  >
                    <header className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          avatarKey={record.student_avatar_key}
                          name={record.student_name}
                          size="sm"
                          className="h-6 w-6 shrink-0"
                        />
                        <span className="text-foreground max-w-32 truncate text-[13px] font-medium">
                          {record.student_name}
                        </span>
                        {record.average_score != null ? (
                          <SpotCheckStarChip value={record.average_score} />
                        ) : null}
                      </div>

                      <div
                        className="text-text-muted flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays className="text-text-muted h-3.5 w-3.5" />
                          <span>
                            {dayjs(record.created_at).format('YYYY-MM-DD')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserRound className="text-text-muted h-3.5 w-3.5" />
                          <span>{record.checker_name}</span>
                        </div>
                        <div className="relative flex h-8 shrink-0 items-center">
                          <ListTag
                            size="xs"
                            className={
                              record.actions.delete
                                ? `${SPOT_CHECK_STATUS_META[record.status].className} transition-all duration-150 group-hover/record:translate-x-1 group-hover/record:opacity-0`
                                : SPOT_CHECK_STATUS_META[record.status].className
                            }
                          >
                            {getRecordStatusLabel(record.status)}
                          </ListTag>
                          {record.actions.delete ? (
                            <Tooltip title="删除抽查">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive-500 hover:bg-destructive-50 hover:text-destructive-700 pointer-events-none absolute right-0 h-8 w-8 -translate-x-1 rounded-lg opacity-0 transition-all duration-150 group-hover/record:pointer-events-auto group-hover/record:translate-x-0 group-hover/record:opacity-100"
                                onClick={() => onDeleteRecord(record)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          ) : null}
                        </div>
                      </div>
                    </header>

                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                      {record.items.map((item) => (
                        <section
                          key={`${record.id}-${item.id ?? item.order ?? item.topic}`}
                          className="bg-muted/45 relative min-h-[92px] rounded-xl p-3"
                        >
                          <h3 className="text-foreground line-clamp-2 pr-16 text-[16px] leading-[1.35] font-semibold">
                            {item.topic}
                          </h3>
                          {item.score != null && item.score !== '' ? (
                            <div className="absolute right-3 bottom-3">
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
              <div className="border-border/60 border-t px-4 py-3">
                <Pagination
                  current={page}
                  total={totalCount}
                  pageSize={pageSize}
                  defaultPageSize={20}
                  onChange={(nextPage) => onPageChange(nextPage)}
                  onShowSizeChange={(_, nextPageSize) =>
                    onPageSizeChange(nextPageSize)
                  }
                  showSizeChanger
                  pageSizeOptions={[10, 20, 50]}
                  showTotal={(count, [start, end]) =>
                    `第 ${start}-${end} 条 / 共 ${count} 条`
                  }
                />
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={ListChecks}
            description="没有符合当前筛选条件的抽查记录。"
          />
        )}
      </Spinner>
    </div>
  );
};
