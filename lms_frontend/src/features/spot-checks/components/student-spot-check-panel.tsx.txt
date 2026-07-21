import { useState } from 'react';
import { Inbox, ListChecks, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ListTag } from '@/components/ui/list-tag';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import type {
  SpotCheck,
  SpotCheckItem,
} from '@/features/spot-checks/types/spot-check';
import { showApiError } from '@/lib/api-error-handler';
import { useMySpotChecks } from '@/features/spot-checks/api/get-my-spot-checks';
import { useSpotCheckDetail } from '@/features/spot-checks/api/get-spot-check';
import { useSubmitSpotCheck } from '@/features/spot-checks/api/submit-spot-check';
import { SPOT_CHECK_STATUS_META } from '@/features/spot-checks/constants/spot-check-status';
import { SPOT_CHECK_FORM_DIALOG_CLASSNAME } from '@/features/spot-checks/constants/spot-check-dialog';
import {
  SpotCheckItemEditor,
  SpotCheckStarChip,
} from '@/features/spot-checks/components/spot-check-item-editor';
import { TopicNavigator } from '@/features/spot-checks/components/spot-check-form';

const statusFilterOptions = [
  { value: 'PENDING', label: '待填写' },
  { value: 'SUBMITTED', label: '已提交' },
  { value: 'SCORED', label: '已评分' },
  { value: 'all', label: '全部' },
];

const PAGE_SIZE = 20;

const SpotCheckStudentCard: React.FC<{
  record: SpotCheck;
  onOpen: () => void;
}> = ({ record, onOpen }) => {
  const statusMeta = SPOT_CHECK_STATUS_META[record.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'border-border/60 bg-background hover:border-primary/25 flex h-full min-h-[148px] w-full flex-col rounded-2xl border p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <ListTag size="xs" className={statusMeta.className}>
          {statusMeta.label}
        </ListTag>
      </div>
      <h3 className="text-foreground line-clamp-2 text-[15px] leading-snug font-semibold">
        {record.topic_summary || '抽查任务'}
      </h3>
      <div className="text-text-muted mt-auto space-y-1 pt-4 text-[12px]">
        <p>发起人 {record.checker_name}</p>
        <p>发起 {dayjs(record.created_at).format('MM-DD HH:mm')}</p>
        {record.status === 'SCORED' && record.average_score != null ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-text-muted font-medium">均分</span>
            <SpotCheckStarChip value={record.average_score} />
          </div>
        ) : null}
      </div>
    </button>
  );
};

/** 按 spotCheckId 挂载，切换记录时草稿状态自然重建。 */
const StudentSpotCheckFormBody: React.FC<{
  spotCheckId: number;
  onClose: () => void;
}> = ({ spotCheckId, onClose }) => {
  const { data, isLoading } = useSpotCheckDetail(spotCheckId);
  const submitMutation = useSubmitSpotCheck();
  const [draftItems, setDraftItems] = useState<SpotCheckItem[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  const items =
    draftItems ??
    data?.items.map((item) => ({
      id: item.id,
      topic: item.topic,
      instruction: item.instruction ?? '',
      instruction_images: item.instruction_images ?? [],
      content: item.content ?? '',
      images: item.images ?? [],
      score: item.score,
      comment: item.comment,
    })) ??
    [];

  const mode = data?.status === 'PENDING' ? 'submit' : 'view';
  const activeItem = items[activeItemIndex];

  const handleItemChange = (
    index: number,
    field: keyof SpotCheckItem,
    value: string | string[],
  ) => {
    setDraftItems((prev) => {
      const base = prev ?? items;
      return base.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
    });
  };

  const handleSubmit = async () => {
    if (!data) return;
    const nextErrors: Record<string, string> = {};
    items.forEach((item, index) => {
      if (item.id == null) {
        nextErrors[`item-${index}-content`] = '抽查项已过期，请关闭后重新打开';
        return;
      }
      if (!(item.content ?? '').trim() && !(item.images ?? []).length) {
        nextErrors[`item-${index}-content`] = '请填写内容或贴图';
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('请先补全填写项');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        id: spotCheckId,
        data: {
          revision: data.revision,
          items: items.map((item) => ({
            id: item.id as number,
            content: (item.content ?? '').trim(),
            images: item.images ?? [],
          })),
        },
      });
      toast.success('提交成功');
      onClose();
    } catch (error) {
      showApiError(error, '提交失败');
    }
  };

  return (
    <>
      <DialogHeader className="shrink-0 px-5 py-5">
        <DialogTitle className="text-foreground text-lg font-semibold">
          {data?.status === 'PENDING' ? '填写抽查' : '抽查详情'}
        </DialogTitle>
      </DialogHeader>

      {isLoading || !data ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-2 pb-5">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5 overflow-hidden px-5 pb-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
          <aside className="mb-px flex min-h-0 flex-col gap-5 rounded-xl bg-[#f6f7fb] p-5">
            <div className="space-y-2">
              <p className="text-text-muted text-xs font-semibold tracking-[0.12em] uppercase">
                发起人
              </p>
              <div className="text-foreground rounded-xl bg-white/72 px-4 py-3 text-sm font-medium">
                {data.checker_name}
              </div>
            </div>
            <TopicNavigator
              items={items}
              activeIndex={activeItemIndex}
              canAdd={false}
              onSelect={setActiveItemIndex}
              onAdd={() => undefined}
            />
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <ScrollContainer className="min-h-0 flex-1 scroll-pb-5 overflow-y-auto pb-px">
              <div className="flex min-h-full pr-1 lg:pr-5">
                {activeItem ? (
                  <SpotCheckItemEditor
                    key={activeItem.id ?? activeItemIndex}
                    index={activeItemIndex}
                    item={activeItem}
                    mode={mode}
                    canRemove={false}
                    errors={errors}
                    className="min-h-full flex-1"
                    onChange={handleItemChange}
                    onRemove={() => undefined}
                  />
                ) : null}
              </div>
            </ScrollContainer>
          </section>
        </div>
      )}

      {mode === 'submit' ? (
        <div className="border-border/60 flex shrink-0 justify-end gap-3 border-t px-5 py-4">
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            提交
          </Button>
        </div>
      ) : null}
    </>
  );
};

const StudentSpotCheckFormDialog: React.FC<{
  spotCheckId: number | null;
  onClose: () => void;
}> = ({ spotCheckId, onClose }) => (
  <Dialog
    open={spotCheckId !== null}
    onOpenChange={(open) => !open && onClose()}
  >
    <DialogContent className={SPOT_CHECK_FORM_DIALOG_CLASSNAME}>
      {spotCheckId !== null ? (
        <StudentSpotCheckFormBody
          key={spotCheckId}
          spotCheckId={spotCheckId}
          onClose={onClose}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);

/** 学员抽查列表：复用任务中心筛选/卡片栅格。 */
export const StudentSpotCheckPanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<number | null>(null);
  const { data, isLoading } = useMySpotChecks({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
  });
  const records = data?.results ?? [];
  const totalCount = data?.count ?? 0;

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const shouldShowPagination = totalCount > PAGE_SIZE;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex flex-col gap-4 pb-1 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedControl
          value={statusFilter}
          onChange={handleStatusChange}
          options={statusFilterOptions}
          className="w-full xl:w-auto xl:shrink-0"
        />
        <span className="text-text-muted text-xs font-bold tracking-widest uppercase">
          当前共{' '}
          <span className="text-primary ml-1 text-base">{totalCount}</span>{' '}
          条抽查
        </span>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
      ) : records.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {records.map((record) => (
              <SpotCheckStudentCard
                key={record.id}
                record={record}
                onOpen={() => setActiveId(record.id)}
              />
            ))}
          </div>
          {shouldShowPagination ? (
            <div className="mt-6">
              <Pagination
                current={page}
                total={totalCount}
                pageSize={PAGE_SIZE}
                defaultPageSize={PAGE_SIZE}
                onChange={(nextPage) => setPage(nextPage)}
                showTotal={(count, [start, end]) =>
                  `第 ${start}-${end} 条 / 共 ${count} 条`
                }
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="bg-muted flex flex-col items-center justify-center rounded-2xl py-32">
          <div className="bg-muted mb-6 flex h-24 w-24 items-center justify-center rounded-md">
            <Inbox className="text-text-muted h-10 w-10" />
          </div>
          <h3 className="text-foreground mb-2 text-2xl font-bold">暂无抽查</h3>
          <p className="text-text-muted flex items-center gap-2 text-sm font-semibold tracking-widest uppercase">
            <ListChecks className="h-4 w-4" />
            有新的抽查会显示在这里
          </p>
        </div>
      )}

      <StudentSpotCheckFormDialog
        spotCheckId={activeId}
        onClose={() => setActiveId(null)}
      />
    </div>
  );
};
