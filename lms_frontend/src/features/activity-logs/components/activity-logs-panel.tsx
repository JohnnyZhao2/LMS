import React, { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  ShieldAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/features/auth/stores/auth-context';
import { ApiError } from '@/lib/api-client';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import {
  useActivityLogs,
  useBulkDeleteActivityLogs,
  useActivityLogUsers,
} from '../api/use-activity-logs';
import { ActivityLogFeed } from './activity-log-feed';
import { ActivityLogMemberList } from './activity-log-member-list';
import type { ActivityLogItem, ActivityLogType } from '../types';
import type { DateRange } from 'react-day-picker';

const LOG_TYPE_META = {
  user: { label: '账号' },
  content: { label: '内容' },
  operation: { label: '行为记录' },
} as const;

const PANEL_GRID_CLASS = 'grid min-h-0 items-stretch gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]';

export const ActivityLogsPanel: React.FC = () => {
  const { hasCapability } = useAuth();
  const canViewActivityLogs = hasCapability('activity_log.view');

  const [activeType, setActiveType] = useState<ActivityLogType>('user');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const deferredSearch = useDeferredValue(search.trim());
  const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const query = useMemo(
    () => ({
      type: activeType,
      page,
      pageSize,
      memberIds: selectedMemberIds,
      search: deferredSearch || undefined,
      dateFrom,
      dateTo,
    }),
    [activeType, dateFrom, dateTo, deferredSearch, page, pageSize, selectedMemberIds]
  );

  const { data, isLoading } = useActivityLogs(query, canViewActivityLogs);
  const { data: activityLogUsers = [] } = useActivityLogUsers(canViewActivityLogs);
  const bulkDeleteActivityLogs = useBulkDeleteActivityLogs();

  const normalizedItems = useMemo<ActivityLogItem[]>(
    () => data?.results ?? [],
    [data?.results]
  );

  const memberActivityCountMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const member of data?.members ?? []) {
      map[member.user.id] = member.activity_count;
    }
    return map;
  }, [data?.members]);

  const selectedMembers = useMemo(
    () => activityLogUsers.filter((member) => selectedMemberIds.includes(member.id)),
    [activityLogUsers, selectedMemberIds]
  );
  const selectedLogs = useMemo(
    () => normalizedItems.filter((item) => selectedLogIds.includes(item.id)),
    [normalizedItems, selectedLogIds]
  );
  const isAllLogsSelected = normalizedItems.length > 0 && selectedLogIds.length === normalizedItems.length;
  const hasPartialLogSelection = selectedLogIds.length > 0 && !isAllLogsSelected;
  const isDeleting = bulkDeleteActivityLogs.isPending;
  const hasActiveFilters =
    selectedMemberIds.length > 0 ||
    search.trim().length > 0 ||
    Boolean(dateRange?.from) ||
    Boolean(dateRange?.to);
  const totalCount = data?.count ?? 0;
  const shouldShowPagination = totalCount > pageSize;

  const handleConfirmBulkDelete = async () => {
    if (selectedLogs.length === 0) return;

    try {
      await bulkDeleteActivityLogs.mutateAsync(selectedLogs.map((item) => item.id));
      if (selectedLogs.length === normalizedItems.length && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
      setSelectedLogIds([]);
      setBulkDeleteOpen(false);
      toast.success(`已删除 ${selectedLogs.length} 条日志`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('批量删除日志失败');
      }
    }
  };

  const handleTypeChange = (nextType: ActivityLogType) => {
    if (nextType === activeType) return;
    startTransition(() => {
      setActiveType(nextType);
      setPage(1);
      setSelectedLogIds([]);
      setDateRange(undefined);
      setSelectedMemberIds([]);
    });
  };

  const handleToggleMember = (memberId: number) => {
    startTransition(() => {
      setSelectedMemberIds((cur) =>
        cur.includes(memberId) ? cur.filter((id) => id !== memberId) : [...cur, memberId]
      );
      setPage(1);
      setSelectedLogIds([]);
    });
  };

  const handleToggleLog = (logId: string) => {
    setSelectedLogIds((current) =>
      current.includes(logId)
        ? current.filter((itemId) => itemId !== logId)
        : [...current, logId]
    );
  };

  const handleToggleAllLogs = () => {
    setSelectedLogIds(isAllLogsSelected ? [] : normalizedItems.map((item) => item.id));
  };

  if (!canViewActivityLogs) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">日志审计</h2>
              <p className="text-xs text-text-muted">统一查看账号、内容与行为记录。</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-error-50 px-3 py-2.5 text-xs font-medium text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" />
            无权查看活动日志。
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageWorkbench className="gap-4">
      <div className={`${PANEL_GRID_CLASS} min-h-0 flex-1 xl:grid-rows-[auto_minmax(0,1fr)]`}>
        <div className="flex min-w-0 items-center gap-2.5 xl:col-start-2 xl:row-start-1">
          <SegmentedControl
            options={(['user', 'content', 'operation'] as const).map((type) => ({
              label: LOG_TYPE_META[type].label,
              value: type,
            }))}
            value={activeType}
            onChange={(v) => handleTypeChange(v as ActivityLogType)}
          />
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              setDateRange(range);
              setPage(1);
              setSelectedLogIds([]);
            }}
            placeholder="时间区间"
            align="end"
            appearance="search"
            className="w-[18.5rem] shrink-0"
          />
          <SearchInput
            className={`${DESKTOP_SEARCH_INPUT_CLASSNAME} ml-auto`}
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); setSelectedLogIds([]); }}
            placeholder="搜索日志"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch(''); setDateRange(undefined);
                setSelectedMemberIds([]); setSelectedLogIds([]); setPage(1);
              }}
              className="h-11 shrink-0 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] text-text-muted transition-colors hover:border-primary-200 hover:bg-primary-50/40 hover:text-foreground"
            >
              清空
            </button>
          )}
        </div>

        {/* 左侧成员列表 */}
        <div className="min-h-0 xl:row-span-2 xl:row-start-1">
          <ActivityLogMemberList
            users={activityLogUsers}
            memberActivityCountMap={memberActivityCountMap}
            selectedMemberIds={selectedMemberIds}
            activeType={activeType}
            onToggleMember={handleToggleMember}
          />
        </div>

        {/* 右侧日志流 */}
        <div className="min-h-0 h-full xl:col-start-2 xl:row-start-2">
          <div className="flex h-full min-h-[38rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
              {/* 选中成员标签 + Tab */}
            <div className="border-b border-border/60 px-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                {selectedMembers.length > 0 ? (
                  <div className="relative flex h-14 min-w-0 items-center gap-2 text-[13px] font-semibold text-primary">
                    <ScrollContainer className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
                      {selectedMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleToggleMember(member.id)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary-50/70 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary-100"
                        >
                          <span>{member.username}</span>
                          <X className="h-3 w-3 opacity-70" />
                        </button>
                      ))}
                    </ScrollContainer>
                    <span className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      {data?.count ?? 0}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-primary" />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="relative inline-flex h-14 items-center text-[13px] font-semibold text-primary"
                  >
                    全部
                    <span className="ml-1.5 rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      {data?.count ?? 0}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-primary" />
                  </button>
                )}

                {canViewActivityLogs && normalizedItems.length > 0 && (
                  <div className="flex h-14 flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12px] font-medium text-foreground">
                      <Checkbox
                        checked={isAllLogsSelected ? true : hasPartialLogSelection ? 'indeterminate' : false}
                        onCheckedChange={handleToggleAllLogs}
                        disabled={isDeleting}
                      />
                      <span>本页全选</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-text-muted">
                        {selectedLogIds.length}/{normalizedItems.length}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setBulkDeleteOpen(true)}
                      disabled={selectedLogIds.length === 0 || isDeleting}
                      className={cn(
                        'inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-medium transition-colors',
                        selectedLogIds.length > 0 && !isDeleting
                          ? 'border-destructive/20 bg-error-50 text-destructive hover:bg-error-100'
                          : 'cursor-not-allowed border-border/60 bg-background text-text-muted opacity-60'
                      )}
                    >
                      删除选中
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 日志列表 */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <ActivityLogFeed
                items={normalizedItems}
                isLoading={isLoading}
                selectedLogIds={selectedLogIds}
                selectionDisabled={isDeleting}
                onToggleSelect={handleToggleLog}
              />
            </div>

            {shouldShowPagination && (
              <div className="border-t border-border/40 px-5 py-3">
                <Pagination
                  current={page}
                  total={totalCount}
                  pageSize={pageSize}
                  defaultPageSize={10}
                  showSizeChanger
                  showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                  onChange={(p, s) => { setPage(p); setPageSize(s); setSelectedLogIds([]); }}
                  onShowSizeChange={(p, s) => { setPage(p); setPageSize(s); setSelectedLogIds([]); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
        }}
        title="删除选中日志？"
        description={`将永久删除已选 ${selectedLogs.length} 条日志记录。此操作不可撤销。`}
        confirmText="确认删除"
        confirmVariant="destructive"
        isConfirming={bulkDeleteActivityLogs.isPending}
        onConfirm={handleConfirmBulkDelete}
      />
    </PageWorkbench>
  );
};
