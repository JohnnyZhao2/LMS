import { CalendarDays, ListChecks, Plus, Trash2, UserRound, UserRoundSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CircleButton } from '@/components/ui/circle-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListTag } from '@/components/ui/list-tag';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import dayjs from '@/lib/dayjs';
import type { SpotCheck, SpotCheckStatus, SpotCheckStudent } from '@/types/spot-check';
import { SpotCheckStarChip } from './spot-check-item-editor';

export type SpotCheckStatusFilter = 'SUBMITTED' | 'PENDING' | 'all';

const STATUS_FILTER_OPTIONS = [
  { label: '待评分', value: 'SUBMITTED' },
  { label: '未提交', value: 'PENDING' },
  { label: '全部', value: 'all' },
];

/** 管理端列表状态文案 */
const MANAGER_STATUS_META: Record<SpotCheckStatus, { label: string; className: string }> = {
  PENDING: { label: '未提交', className: 'bg-primary-100/70 text-primary-700' },
  SUBMITTED: { label: '待评分', className: 'bg-warning-100/75 text-warning-700' },
  SCORED: { label: '已评分', className: 'bg-secondary-100/70 text-secondary-700' },
};

interface SpotCheckRecordListProps {
  selectedStudent: SpotCheckStudent | null;
  records: SpotCheck[];
  totalCount: number;
  page: number;
  pageSize: number;
  statusFilter: SpotCheckStatusFilter;
  onStatusFilterChange: (value: SpotCheckStatusFilter) => void;
  isLoading: boolean;
  onEditRecord: (record: SpotCheck) => void;
  onDeleteRecord: (record: SpotCheck) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  canCreateSpotCheck?: boolean;
  checkedCount?: number;
  onCreateSpotCheck?: () => void;
}

export const SpotCheckRecordList: React.FC<SpotCheckRecordListProps> = ({
  selectedStudent,
  records,
  totalCount,
  page,
  pageSize,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  onEditRecord,
  onDeleteRecord,
  onPageChange,
  onPageSizeChange,
  canCreateSpotCheck = false,
  checkedCount = 0,
  onCreateSpotCheck,
}) => {
  const shouldShowPagination = totalCount > 0 && (totalCount > pageSize || pageSize !== 20);
  const canCreate = canCreateSpotCheck && checkedCount > 0 && !!onCreateSpotCheck;

  return (
    <div className="flex min-h-[36rem] min-w-0 flex-col gap-3 xl:max-h-full">
      {/* 独立顶栏：筛选 tab + 新建 */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <SegmentedControl
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as SpotCheckStatusFilter)}
        />
        {canCreateSpotCheck && onCreateSpotCheck ? (
          <Tooltip title={canCreate ? `向 ${checkedCount} 人发起` : '请先勾选学员'}>
            <span className="inline-flex">
              <CircleButton
                onClick={onCreateSpotCheck}
                disabled={!canCreate}
                label="发起抽查"
                className="shrink-0"
                icon={<Plus className="h-4 w-4" strokeWidth={2.5} />}
              />
            </span>
          </Tooltip>
        ) : null}
      </div>

      {/* 卡片内容容器 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
        {!selectedStudent ? (
          <EmptyState
            icon={UserRoundSearch}
            description="请先在左侧选择一个学员，再查看抽查记录。"
          />
        ) : (
          <Spinner spinning={isLoading} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {records.length > 0 ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <ScrollContainer className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                  <div className="space-y-4">
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
                        className="w-full cursor-pointer overflow-hidden rounded-xl border border-border/70 bg-background shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-colors hover:border-primary/25 hover:bg-primary/[0.015]"
                      >
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-muted">
                            {statusFilter === 'all' ? (
                              <ListTag size="xs" className={MANAGER_STATUS_META[record.status].className}>
                                {MANAGER_STATUS_META[record.status].label}
                              </ListTag>
                            ) : null}
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
                            <SpotCheckStarChip value={record.average_score} />
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
                              <div className="absolute bottom-3 right-3">
                                <SpotCheckStarChip value={item.score} />
                              </div>
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
                description={
                  statusFilter === 'SUBMITTED'
                    ? '暂无待评分的抽查记录。'
                    : statusFilter === 'PENDING'
                      ? '暂无未提交的抽查记录。'
                      : '该学员还没有抽查记录。'
                }
              />
            )}
          </Spinner>
        )}
      </div>
    </div>
  );
};
