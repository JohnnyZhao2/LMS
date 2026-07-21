import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { ROUTES } from '@/config/routes';
import { ApiError } from '@/lib/api-client';
import { invalidateAfterSpotCheckMutation } from '@/lib/cache-invalidation/spot-checks';
import { cn } from '@/lib/utils';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type {
  SpotCheck,
  SpotCheckItem,
  SpotCheckStudent,
} from '@/features/spot-checks/types/spot-check';
import { showApiError } from '@/lib/api-error-handler';
import { useCreateSpotCheck } from '@/features/spot-checks/api/create-spot-check';
import { useSpotCheckBatchPeers } from '@/features/spot-checks/api/get-spot-check-batch-peers';
import { useSpotCheckDetail } from '@/features/spot-checks/api/get-spot-check';
import { useScoreSpotCheck } from '@/features/spot-checks/api/score-spot-check';
import { SPOT_CHECK_STATUS_META } from '@/features/spot-checks/constants/spot-check-status';
import {
  SpotCheckItemEditor,
  SpotCheckStarChip,
} from '@/features/spot-checks/components/spot-check-item-editor';

const isVersionMismatch = (error: unknown) =>
  error instanceof ApiError && error.code === 'RESOURCE_VERSION_MISMATCH';

const createEmptyItem = (): SpotCheckItem => ({
  topic: '',
  instruction: '',
  instruction_images: [],
  content: '',
  score: '',
  comment: '',
  images: [],
});
const AVATARS_PER_PAGE = 10;

const normalizeItems = (items: SpotCheckItem[]) => {
  if (items.length === 0) return [createEmptyItem()];
  return items.map((item) => ({
    id: item.id,
    topic: item.topic ?? '',
    instruction: item.instruction ?? '',
    instruction_images: item.instruction_images ?? [],
    content: item.content ?? '',
    score: item.score != null && item.score !== '' ? String(item.score) : '',
    comment: item.comment ?? '',
    images: item.images ?? [],
  }));
};

const averageScoreOf = (items: SpotCheckItem[]) => {
  const scores = items
    .map((item) => Number(item.score))
    .filter((score, index) => {
      const raw = items[index].score;
      return raw !== '' && raw != null && !Number.isNaN(score);
    });
  if (scores.length === 0) return null;
  return (
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  ).toFixed(1);
};

interface SpotCheckFormProps {
  spotCheckId?: number;
  /** 发起态：列表页传入已勾选学员摘要，避免再依赖 assignable 列表 */
  students?: SpotCheckStudent[];
  hidePageHeader?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  onSwitchRecord?: (record: SpotCheck) => void;
}

const StudentCard: React.FC<{
  name: string;
  employeeId?: string | null;
  avatarKey?: string | null;
  sub?: string;
}> = ({ name, employeeId, avatarKey, sub }) => (
  <div className="rounded-xl bg-white/72 p-4">
    <div className="flex items-center gap-3">
      <UserAvatar avatarKey={avatarKey} name={name} size="md" />
      <div className="min-w-0">
        <p className="text-foreground truncate text-sm font-semibold">{name}</p>
        <p className="text-text-muted truncate text-xs">
          {employeeId || '未填写工号'}
          {sub ? ` · ${sub}` : ''}
        </p>
      </div>
    </div>
  </div>
);

const StudentAvatarStack: React.FC<{
  students: Array<{ id: number; name: string; avatarKey?: string | null }>;
}> = ({ students }) => {
  const [page, setPage] = useState(0);
  const [slideDirection, setSlideDirection] = useState<-1 | 1>(1);
  const pageCount = Math.max(1, Math.ceil(students.length / AVATARS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleStudents = students.slice(
    currentPage * AVATARS_PER_PAGE,
    currentPage * AVATARS_PER_PAGE + AVATARS_PER_PAGE,
  );
  const shouldShowArrows = students.length > AVATARS_PER_PAGE;
  const canScrollLeft = currentPage > 0;
  const canScrollRight = currentPage < pageCount - 1;

  const changePage = (direction: -1 | 1) => {
    setSlideDirection(direction);
    setPage((current) =>
      Math.min(Math.max(0, current + direction), pageCount - 1),
    );
  };

  return (
    <div className="group/avatar-stack relative -mx-6 min-w-0 px-6">
      {shouldShowArrows ? (
        <button
          type="button"
          aria-label="查看前面的学员"
          disabled={!canScrollLeft}
          onClick={() => changePage(-1)}
          className="text-text-muted hover:text-foreground pointer-events-none absolute top-1/2 left-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-transparent opacity-0 transition-opacity group-hover/avatar-stack:pointer-events-auto group-hover/avatar-stack:opacity-100 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}
      <div
        key={currentPage}
        className={cn(
          'flex min-w-0 items-center justify-start py-1',
          slideDirection === 1
            ? 'avatar-stack-enter-forward'
            : 'avatar-stack-enter-backward',
        )}
      >
        {visibleStudents.map((student) => (
          <Tooltip key={student.id} title={student.name}>
            <div className="-ml-[9px] shrink-0 first:ml-0 hover:z-10">
              <UserAvatar
                avatarKey={student.avatarKey}
                name={student.name}
                size="md"
                className="h-8 w-8 ring-2 ring-[#f6f7fb]"
              />
            </div>
          </Tooltip>
        ))}
      </div>
      {shouldShowArrows ? (
        <button
          type="button"
          aria-label="查看后面的学员"
          disabled={!canScrollRight}
          onClick={() => changePage(1)}
          className="text-text-muted hover:text-foreground pointer-events-none absolute top-1/2 right-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-transparent opacity-0 transition-opacity group-hover/avatar-stack:pointer-events-auto group-hover/avatar-stack:opacity-100 disabled:pointer-events-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

/** 同批学员切换：未提交不可点，待评黑字，已评灰字 */
const PeerSwitcher: React.FC<{
  currentId: number;
  peers: SpotCheck[];
  onSwitch: (record: SpotCheck) => void;
}> = ({ currentId, peers, onSwitch }) => {
  const current = peers.find((p) => p.id === currentId) ?? peers[0];
  if (!current) return null;

  if (peers.length <= 1) {
    return (
      <StudentCard
        name={current.student_name}
        employeeId={current.student_employee_id}
        avatarKey={current.student_avatar_key}
        sub={SPOT_CHECK_STATUS_META[current.status]?.label}
      />
    );
  }

  return (
    <Select
      value={String(currentId)}
      onValueChange={(value) => {
        const next = peers.find((p) => p.id === Number(value));
        if (next && next.id !== currentId) onSwitch(next);
      }}
    >
      <SelectTrigger className="h-auto w-full gap-2 rounded-xl border-transparent bg-white/72 p-4 shadow-none hover:bg-white data-[state=open]:border-transparent data-[state=open]:shadow-none">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <UserAvatar
            avatarKey={current.student_avatar_key}
            name={current.student_name}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-semibold">
              {current.student_name}
            </p>
            <p className="text-text-muted truncate text-xs">
              {current.student_employee_id || '未填写工号'}
              {' · '}
              {SPOT_CHECK_STATUS_META[current.status]?.label ?? current.status}
            </p>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)]">
        {peers.map((peer) => {
          const pending = peer.status === 'PENDING';
          const scored = peer.status === 'SCORED';
          return (
            <SelectItem
              key={peer.id}
              value={String(peer.id)}
              textValue={peer.student_name}
              disabled={pending}
              className={
                pending
                  ? 'text-text-muted/50 cursor-not-allowed data-[disabled]:opacity-50'
                  : scored
                    ? 'text-text-muted focus:text-text-muted data-[state=checked]:text-text-muted'
                    : 'text-foreground focus:text-foreground'
              }
            >
              {peer.student_name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

interface StatBlockProps {
  label?: string;
  value: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  active = false,
  onClick,
}) => {
  const content = (
    <>
      {label ? (
        <p className="text-text-muted text-[11px] font-medium tracking-[0.08em] uppercase">
          {label}
        </p>
      ) : null}
      <div
        className={cn(
          'text-foreground min-w-0 font-semibold',
          label ? 'mt-1 text-lg' : 'text-base',
        )}
      >
        {value}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-left transition-colors',
          active ? 'bg-white' : 'bg-transparent hover:bg-white/70',
        )}
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-xl bg-white/68 px-4 py-3">{content}</div>;
};

interface TopicNavigatorProps {
  items: SpotCheckItem[];
  activeIndex: number;
  canAdd: boolean;
  onSelect: (index: number) => void;
  onAdd: () => void;
}

export const TopicNavigator: React.FC<TopicNavigatorProps> = ({
  items,
  activeIndex,
  canAdd,
  onSelect,
  onAdd,
}) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <p className="text-text-muted text-xs font-semibold tracking-[0.12em] uppercase">
      抽查项 · {items.length}
    </p>
    <ScrollContainer className="mt-2 min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-2 pr-1">
        {items.map((item, index) => {
          const active = index === activeIndex;
          const topic = item.topic.trim();

          return (
            <StatBlock
              key={`topic-nav-${index}`}
              value={
                <span className="block truncate">
                  {index + 1}. {topic}
                </span>
              }
              active={active}
              onClick={() => onSelect(index)}
            />
          );
        })}
      </div>
    </ScrollContainer>
    {canAdd ? (
      <Tooltip title="新建主题">
        <button
          type="button"
          aria-label="新建主题"
          onClick={onAdd}
          className="text-foreground hover:text-primary focus-visible:ring-primary mt-3 flex h-9 w-9 items-center justify-center self-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    ) : null}
  </div>
);

/**
 * 内层表单：以 recordKey 重建，避免在 Effect 中同步 setState 重置草稿。
 */
const SpotCheckFormInner: React.FC<
  SpotCheckFormProps & {
    resolvedSpotCheckId: number | null;
    isEdit: boolean;
  }
> = ({
  resolvedSpotCheckId,
  isEdit,
  students = [],
  hidePageHeader = false,
  onCancel,
  onSuccess,
  onSwitchRecord,
}) => {
  const { roleNavigate } = useRoleNavigate();
  const queryClient = useQueryClient();
  const createSpotCheck = useCreateSpotCheck();
  const scoreSpotCheck = useScoreSpotCheck();
  const { data: spotCheckDetail, isLoading: detailLoading } =
    useSpotCheckDetail(resolvedSpotCheckId ?? 0);

  const [draftItems, setDraftItems] = useState<SpotCheckItem[] | null>(
    isEdit ? null : [createEmptyItem()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const latestScoreItemsRef = useRef<SpotCheckItem[] | null>(null);
  const scoreSaveInFlightRef = useRef(false);
  const scoreSaveQueuedRef = useRef(false);
  const modeRef = useRef<'issue' | 'score' | 'view'>('issue');
  const idRef = useRef<number | null>(resolvedSpotCheckId);
  const revisionRef = useRef<number | null>(null);

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const canScore = spotCheckDetail?.actions?.score === true;

  // 已创建记录不再编辑主题：已提交/已评分 → 评分；待填写 → 只读（布局同评分）
  const mode: 'issue' | 'score' | 'view' = !isEdit
    ? 'issue'
    : canScore
      ? 'score'
      : 'view';

  modeRef.current = mode;
  idRef.current = resolvedSpotCheckId;

  // 取本地与服务端较大 revision，避免保存成功后缓存未刷新时把版本打回旧值
  useEffect(() => {
    if (spotCheckDetail?.revision == null) return;
    revisionRef.current = Math.max(
      revisionRef.current ?? 0,
      spotCheckDetail.revision,
    );
  }, [spotCheckDetail?.revision]);

  const handleVersionConflict = () => {
    setDraftItems(null);
    revisionRef.current = null;
    invalidateAfterSpotCheckMutation(queryClient);
  };

  const canSwitchPeers =
    Boolean(onSwitchRecord) && isEdit && Boolean(spotCheckDetail?.batch_id);
  const { data: peerList = [] } = useSpotCheckBatchPeers(
    canSwitchPeers ? spotCheckDetail?.batch_id : null,
  );

  const baseItems = isEdit
    ? spotCheckDetail
      ? normalizeItems(spotCheckDetail.items)
      : []
    : [createEmptyItem()];
  const items = draftItems ?? baseItems;
  const activeItemIndex = Math.min(
    selectedItemIndex,
    Math.max(items.length - 1, 0),
  );
  const activeItem = items[activeItemIndex];
  const averageScore = averageScoreOf(items);
  const isSubmitting = createSpotCheck.isPending || scoreSpotCheck.isPending;

  const createStudents = useMemo(() => {
    if (isEdit) return [];
    return students.map((user) => ({
      id: user.id,
      name: user.username,
      avatarKey: user.avatar_key,
    }));
  }, [isEdit, students]);

  const scorePeers = useMemo(() => {
    if (!spotCheckDetail || !canSwitchPeers) return [];
    const fromList = peerList.filter(
      (r) => r.batch_id && r.batch_id === spotCheckDetail.batch_id,
    );
    const peers = fromList.some((r) => r.id === spotCheckDetail.id)
      ? fromList
      : [spotCheckDetail, ...fromList];
    const order = { SUBMITTED: 0, SCORED: 1, PENDING: 2 } as const;
    return peers.sort((a, b) => {
      const d = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      return d !== 0
        ? d
        : a.student_name.localeCompare(b.student_name, 'zh-CN');
    });
  }, [canSwitchPeers, peerList, spotCheckDetail]);

  const runScoreSaveLoop = async () => {
    if (scoreSaveInFlightRef.current) {
      scoreSaveQueuedRef.current = true;
      return;
    }
    scoreSaveInFlightRef.current = true;
    try {
      do {
        scoreSaveQueuedRef.current = false;
        const nextItems = latestScoreItemsRef.current;
        const id = idRef.current;
        const revision = revisionRef.current;
        if (
          !nextItems ||
          !id ||
          revision == null ||
          modeRef.current !== 'score'
        )
          break;
        try {
          const saved = await scoreSpotCheck.mutateAsync({
            id,
            data: {
              revision,
              items: nextItems.map((item) => ({
                id: item.id as number,
                score:
                  item.score === '' || item.score == null
                    ? null
                    : String(item.score),
                comment: (item.comment ?? '').trim(),
              })),
            },
          });
          if (saved?.revision != null) revisionRef.current = saved.revision;
        } catch (error) {
          showApiError(error, '评分保存失败');
          if (isVersionMismatch(error)) handleVersionConflict();
          break;
        }
      } while (scoreSaveQueuedRef.current);
    } finally {
      scoreSaveInFlightRef.current = false;
    }
  };

  const persistScore = (nextItems: SpotCheckItem[]) => {
    latestScoreItemsRef.current = nextItems;
    void runScoreSaveLoop();
  };

  const handleItemChange = (
    index: number,
    field: keyof SpotCheckItem,
    value: string | string[],
  ) => {
    const next = (draftItems ?? baseItems).map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    setDraftItems(next);
    // 星级与评语均走队列即时保存，避免关弹窗丢评语
    if (mode === 'score' && (field === 'score' || field === 'comment'))
      persistScore(next);
  };

  const handleCommentBlur = () => {
    if (mode === 'score') persistScore(draftItems ?? baseItems);
  };

  const handleAddItem = () => {
    const current = draftItems ?? baseItems;
    setDraftItems([...current, createEmptyItem()]);
    setSelectedItemIndex(current.length);
  };

  const handleRemoveItem = (index: number) => {
    const current = draftItems ?? baseItems;
    if (current.length <= 1) return;
    setDraftItems(current.filter((_, i) => i !== index));
    setSelectedItemIndex((currentIndex) => {
      if (currentIndex > index) return currentIndex - 1;
      return Math.min(currentIndex, current.length - 2);
    });
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!isEdit && studentIds.length === 0)
      nextErrors.student = '请先在左侧选择或勾选学员';
    items.forEach((item, index) => {
      if (mode === 'issue' && !item.topic.trim()) {
        nextErrors[`item-${index}-topic`] = '请输入抽查主题';
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const leave = () => {
    if (onCancel) onCancel();
    else roleNavigate(ROUTES.SPOT_CHECKS);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('请先补全必填项');
      return;
    }
    try {
      await createSpotCheck.mutateAsync({
        students: studentIds,
        items: items.map((item) => ({
          topic: item.topic.trim(),
          instruction: (item.instruction ?? '').trim(),
          instruction_images: item.instruction_images ?? [],
        })),
      });
      toast.success(`已向 ${studentIds.length} 名学员发起抽查`);
      if (onSuccess) onSuccess();
      else roleNavigate(ROUTES.SPOT_CHECKS);
    } catch (error) {
      showApiError(error, '发起失败');
    }
  };

  const showScoreStats =
    mode === 'score' || spotCheckDetail?.status === 'SCORED';
  const editorMode =
    mode === 'issue' ? 'issue' : mode === 'score' ? 'score' : 'view';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!hidePageHeader ? (
        <PageHeader
          title={
            isEdit ? (mode === 'score' ? '抽查评分' : '抽查详情') : '发起抽查'
          }
          icon={<ListChecks className="h-5 w-5" />}
        />
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-8 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex h-full min-h-0 flex-col gap-5 rounded-2xl bg-[#f6f7fb] p-5">
          <div className="space-y-2">
            <p className="text-text-muted text-xs font-semibold tracking-[0.12em] uppercase">
              {isEdit
                ? canSwitchPeers && scorePeers.length > 1
                  ? `学员 · ${scorePeers.length} 人`
                  : '学员'
                : `学员 · ${studentIds.length} 人`}
            </p>

            {isEdit ? (
              detailLoading && !spotCheckDetail ? (
                <div className="text-text-muted rounded-xl bg-white/70 px-4 py-3 text-sm">
                  加载中...
                </div>
              ) : canSwitchPeers &&
                onSwitchRecord &&
                scorePeers.length > 0 &&
                resolvedSpotCheckId ? (
                <PeerSwitcher
                  currentId={resolvedSpotCheckId}
                  peers={scorePeers}
                  onSwitch={onSwitchRecord}
                />
              ) : spotCheckDetail ? (
                <StudentCard
                  name={spotCheckDetail.student_name}
                  employeeId={spotCheckDetail.student_employee_id}
                  avatarKey={spotCheckDetail.student_avatar_key}
                  sub={spotCheckDetail.student_department ?? undefined}
                />
              ) : null
            ) : (
              <div>
                {createStudents.length > 0 ? (
                  <StudentAvatarStack students={createStudents} />
                ) : (
                  <div className="text-text-muted rounded-xl bg-white/70 px-4 py-3 text-sm">
                    请先在左侧选择或勾选学员
                  </div>
                )}
                {errors.student ? (
                  <p className="text-destructive-500 text-sm">
                    {errors.student}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {showScoreStats ? (
            <StatBlock
              label="均分"
              value={<SpotCheckStarChip value={averageScore} />}
            />
          ) : null}

          <TopicNavigator
            items={items}
            activeIndex={activeItemIndex}
            canAdd={mode === 'issue'}
            onSelect={setSelectedItemIndex}
            onAdd={handleAddItem}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <ScrollContainer className="min-h-0 flex-1 overflow-y-auto">
            <div
              className={cn(
                'space-y-4 pr-5 pb-1',
                mode === 'issue' && 'flex h-full flex-col [&>section]:flex-1',
              )}
            >
              {activeItem ? (
                <SpotCheckItemEditor
                  key={`spot-check-item-${activeItemIndex}`}
                  index={activeItemIndex}
                  item={activeItem}
                  mode={editorMode}
                  canRemove={items.length > 1}
                  errors={errors}
                  onChange={handleItemChange}
                  onCommentBlur={
                    mode === 'score' ? handleCommentBlur : undefined
                  }
                  onRemove={handleRemoveItem}
                />
              ) : null}
              {scoreSpotCheck.isPending && isEdit ? (
                <p className="text-text-muted text-[12px]">保存中…</p>
              ) : null}
            </div>
          </ScrollContainer>
        </section>
      </div>

      {!isEdit ? (
        <div className="border-border/70 mt-4 flex shrink-0 flex-wrap justify-end gap-3 border-t pt-4 pr-5">
          <Button variant="outline" onClick={leave}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            发起抽查
          </Button>
        </div>
      ) : null}
    </div>
  );
};

/** 外层：用 key 按记录重建内层，切换学员时草稿自然重置。 */
export const SpotCheckForm: React.FC<SpotCheckFormProps> = (props) => {
  const { id: routeId } = useParams<{ id: string }>();
  const routeSpotCheckId = routeId ? Number(routeId) : Number.NaN;
  const resolvedSpotCheckId =
    typeof props.spotCheckId === 'number'
      ? props.spotCheckId
      : Number.isNaN(routeSpotCheckId)
        ? null
        : routeSpotCheckId;
  const isEdit = resolvedSpotCheckId !== null;
  const formKey = isEdit
    ? `edit-${resolvedSpotCheckId}`
    : `create-${(props.students ?? []).map((s) => s.id).join(',')}`;

  return (
    <SpotCheckFormInner
      key={formKey}
      {...props}
      resolvedSpotCheckId={resolvedSpotCheckId}
      isEdit={isEdit}
    />
  );
};

export default SpotCheckForm;
