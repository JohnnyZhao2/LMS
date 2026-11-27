import * as React from 'react';
import { ChevronDown, Circle, Hash, Inbox, Search, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useCreateTag, useTags } from '@/api/tags';
import { SelectionIndicator } from '@/components/common/selection-indicator';
import { TagInput } from '@/components/tags/tag-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/config/routes';
import {
  useBulkDeleteKnowledge,
  useBulkUpdateKnowledge,
  useCreateKnowledge,
  useDeleteKnowledge,
  useIncrementViewCount,
  useInfiniteKnowledgeList,
  usePinnedKnowledgeList,
  useUpdateKnowledge,
} from '@/features/knowledge/api/knowledge';
import { AddKnowledgeCard } from '@/features/knowledge/components/cards/knowledge-add-card';
import { KnowledgeCardMymind } from '@/features/knowledge/components/cards/knowledge-card';
import {
  KnowledgeCardContextMenu,
  KnowledgePinnedBar,
  type KnowledgeContextMenuState,
} from '@/features/knowledge/components/knowledge-pinned-bar';
import { KnowledgeTagFilterPopover } from '@/features/knowledge/components/knowledge-tag-filter-popover';
import { KnowledgeXlsxActions } from '@/features/knowledge/components/knowledge-xlsx-actions';
import { SpacePickerList } from '@/features/knowledge/components/shared/space-picker-list';
import {
  KnowledgeDetailModal,
  type KnowledgeLearning,
} from '@/features/knowledge/components/modals/knowledge-detail-modal';
import { useWorkbench } from '@/hooks/use-workbench';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { SimpleTag, Tag as TagType } from '@/types/common';
import type { KnowledgeListItem } from '@/types/knowledge';
import { showApiError } from '@/utils/error-handler';

type KnowledgeModalState =
  | {
      kind: 'create';
      initialTitle?: string;
      initialContent?: string;
      initialExternalDocUrl?: string;
      initialSpaceTagId?: number;
    }
  | { kind: 'detail'; knowledgeId: number; startInFocus?: boolean };

type SpaceFilter = 'all' | number | undefined;

const MASONRY_MIN_COL_WIDTH = 336;
const MASONRY_COL_GAP = 22;
const SPACE_PILL_GAP = 8;
const MORE_SPACES_BTN_WIDTH = 116;
const SPACE_PILL_HOVER_SHADOW = '0 6px 18px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)';
const SPACE_PILL_BUTTON_CLASS =
  'inline-flex h-8 max-w-full shrink-0 cursor-pointer items-center gap-2 rounded-[7px] border border-black/[0.05] bg-white px-2.5 text-[12.5px] font-medium shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-150 hover:border-black/[0.1] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]';

function estimateInlineTextWidth(text: string, fontSizePx = 12.5): number {
  const scale = fontSizePx / 12.5;
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x2e7f) {
      width += 13 * scale;
    } else if (/[\s.,;:'"`!|()[\]{}\-_/]/.test(ch)) {
      width += 4.5 * scale;
    } else {
      width += 7.8 * scale;
    }
  }
  return width;
}

function estimateSpacePillWidth(name: string, extraTagChipWidth = 0): number {
  // px-2.5(20) + border(2) + indicator(14) + gap-2(8) + 安全余量(6)
  const textWidth = Math.min(224, estimateInlineTextWidth(name, 12.5));
  return Math.ceil(50 + textWidth + extraTagChipWidth);
}

/** 估算卡片高度，用于真瀑布流按最短列均衡排布，保证垂直零空洞且各列齐整 */
function estimateMasonryCardHeight(item: KnowledgeListItem): number {
  const groupedCount = item.grouped_items && item.grouped_items.length > 1 ? item.grouped_items.length : 0;
  if (groupedCount > 0) {
    const headerH = 38;
    const listH = Math.min(groupedCount * 33 + 16, 344);
    return headerH + listH + Math.min(groupedCount - 1, 2) * 3;
  }
  const titleLen = (item.title || '').length;
  const previewLen = (item.content_preview || '').replace(/<[^>]+>/g, '').length;
  const titleH = titleLen > 0 ? Math.min(2, Math.ceil(titleLen / 20)) * 22 + 10 : 0;
  const bodyLines = Math.min(10, Math.ceil(previewLen / 28));
  const bodyH = bodyLines * 23;
  return 54 + (item.section || item.space_tag ? 24 : 0) + titleH + bodyH;
}

/** 保证空间色在白底上作为文字清晰可读：浅色自动压暗，深色保留原色 */
function resolveTagActiveColor(spaceColor?: string | null): string {
  if (!spaceColor) return 'var(--theme-primary)';
  const hex = spaceColor.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return spaceColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.72) {
    return `color-mix(in srgb, ${spaceColor} 62%, #1f2937)`;
  }
  if (luminance > 0.58) {
    return `color-mix(in srgb, ${spaceColor} 78%, #1f2937)`;
  }
  return spaceColor;
}

export const KnowledgeCenter: React.FC<{ learning?: KnowledgeLearning }> = ({ learning }) => {
  const navigate = useNavigate();
  const workbench = useWorkbench();
  const location = useLocation();
  const { id: routeKnowledgeId } = useParams<{ id?: string }>();
  const incrementViewCount = useIncrementViewCount();
  const { hasCapability } = useAuth();

  const canCreateKnowledge = hasCapability('knowledge.add_knowledge');
  const canUpdateKnowledge = hasCapability('knowledge.change_knowledge');
  const canDeleteKnowledge = hasCapability('knowledge.delete_knowledge');
  const canCreateTag = hasCapability('tags.add_tag');
  const canBulkOperate = canUpdateKnowledge || canDeleteKnowledge;
  const isManagementView = workbench === 'manage' && (
    canCreateKnowledge || canUpdateKnowledge || canDeleteKnowledge
  );

  const deleteKnowledge = useDeleteKnowledge();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const bulkUpdateKnowledge = useBulkUpdateKnowledge();
  const bulkDeleteKnowledge = useBulkDeleteKnowledge();
  const createTag = useCreateTag();

  const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);
  const [modalState, setModalState] = React.useState<KnowledgeModalState | null>(null);
  const [draggingCard, setDraggingCard] = React.useState<KnowledgeListItem | null>(null);
  const [activePreviewCardId, setActivePreviewCardId] = React.useState<number | null>(null);
  const [contextMenu, setContextMenu] = React.useState<KnowledgeContextMenuState | null>(null);
  const [pendingPinOverrides, setPendingPinOverrides] = React.useState<Record<number, KnowledgeListItem | null>>({});

  const [search, setSearch] = React.useState('');
  const [searchValue, setSearchValue] = React.useState('');
  const [spaceFilter, setSpaceFilter] = React.useState<SpaceFilter>(undefined);
  const [openTagPopoverKey, setOpenTagPopoverKey] = React.useState<'all' | number | null>(null);
  const [moreSpacesOpen, setMoreSpacesOpen] = React.useState(false);
  const [selectedTagIds, setSelectedTagIds] = React.useState<number[]>([]);
  const [spaceBarWidth, setSpaceBarWidth] = React.useState(0);
  const spaceBarRef = React.useRef<HTMLDivElement | null>(null);
  const tagPopoverCloseTimerRef = React.useRef<number | null>(null);
  const tagPopoverSearchRef = React.useRef<HTMLInputElement | null>(null);
  const selectedSpaceTagId = typeof spaceFilter === 'number' ? spaceFilter : undefined;

  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = React.useState(false);
  const [isSpacePopoverOpen, setIsSpacePopoverOpen] = React.useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = React.useState(false);

  const pageSize = 24;

  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeKnowledgeIdNumber = routeKnowledgeId ? Number(routeKnowledgeId) : null;
  const hashKnowledgeId = React.useMemo(() => {
    const rawHash = location.hash.replace(/^#/, '').trim();
    if (!rawHash) return null;
    const parsed = Number(rawHash);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [location.hash]);
  const taskId = Number(searchParams.get('task') || 0);
  const taskKnowledgeId = Number(searchParams.get('taskKnowledgeId') || 0);
  const fromDashboard = searchParams.get('from') === 'dashboard';
  const isCreateRoute = location.pathname.endsWith('/knowledge/create');

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchValue.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  const { data: spaceTags = [] } = useTags({ tag_type: 'SPACE' });
  const { data: knowledgeTags = [] } = useTags({
    tag_type: 'TAG',
    applicable_to: 'knowledge',
    space_tag_id: selectedSpaceTagId,
    enabled: spaceFilter !== undefined,
  });

  const selectedTagIdSet = React.useMemo(() => new Set(selectedTagIds), [selectedTagIds]);

  const selectedSpaceTag = React.useMemo(
    () => spaceTags.find((tag) => tag.id === selectedSpaceTagId),
    [spaceTags, selectedSpaceTagId],
  );
  const selectedTags = React.useMemo(
    () => knowledgeTags.filter((tag) => selectedTagIdSet.has(tag.id)),
    [knowledgeTags, selectedTagIdSet],
  );
  const activeTagColor = React.useMemo(
    () => resolveTagActiveColor(selectedSpaceTag?.color),
    [selectedSpaceTag?.color],
  );

  React.useEffect(() => {
    setSelectedTagIds([]);
  }, [spaceFilter]);

  const toggleSecondaryTag = React.useCallback((tagId: number) => {
    setSelectedTagIds((prev) => (
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    ));
  }, []);

  const cancelCloseTagPopover = React.useCallback(() => {
    if (tagPopoverCloseTimerRef.current !== null) {
      window.clearTimeout(tagPopoverCloseTimerRef.current);
      tagPopoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleCloseTagPopover = React.useCallback(() => {
    if (
      tagPopoverSearchRef.current
      && document.activeElement === tagPopoverSearchRef.current
    ) {
      return;
    }
    cancelCloseTagPopover();
    tagPopoverCloseTimerRef.current = window.setTimeout(() => {
      setOpenTagPopoverKey(null);
      tagPopoverCloseTimerRef.current = null;
    }, 220);
  }, [cancelCloseTagPopover]);

  React.useEffect(() => () => {
    if (tagPopoverCloseTimerRef.current !== null) {
      window.clearTimeout(tagPopoverCloseTimerRef.current);
    }
  }, []);

  const handleSpacePillClick = React.useCallback((key: 'all' | number) => {
    cancelCloseTagPopover();
    if (spaceFilter === key) {
      setOpenTagPopoverKey((prev) => (prev === key ? null : key));
      return;
    }
    setSpaceFilter(key);
    setOpenTagPopoverKey(key);
  }, [cancelCloseTagPopover, spaceFilter]);

  const { data: rawPinnedItems = [] } = usePinnedKnowledgeList();
  const pinnedItems = React.useMemo(() => {
    const filtered = rawPinnedItems.filter((item) => pendingPinOverrides[item.id] !== null);
    const existingIds = new Set(filtered.map((item) => item.id));
    const added = Object.values(pendingPinOverrides).filter(
      (item): item is KnowledgeListItem => item !== null && !existingIds.has(item.id),
    );
    return [...added, ...filtered];
  }, [rawPinnedItems, pendingPinOverrides]);
  const pinnedIdSet = React.useMemo(
    () => new Set(pinnedItems.map((item) => item.id)),
    [pinnedItems],
  );

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteKnowledgeList({
    search: search || undefined,
    space_tag_id: selectedSpaceTagId,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    pageSize,
  });

  const knowledgeItems = React.useMemo(
    () => (data?.pages ?? []).flatMap((pageData) => pageData.results),
    [data?.pages],
  );
  const allLoadedKnowledgeIds = React.useMemo(
    () => knowledgeItems.flatMap((item) => (
      item.grouped_items && item.grouped_items.length > 1
        ? item.grouped_items.map((row) => row.id)
        : [item.id]
    )),
    [knowledgeItems],
  );
  const totalCount = data?.pages?.[0]?.total_knowledge_count ?? data?.pages?.[0]?.count ?? 0;
  const hasKnowledgeResults = knowledgeItems.length > 0;
  const hasSelection = isManagementView && canBulkOperate && selectedIds.length > 0;
  const showAddCard = isManagementView && canCreateKnowledge;
  const shouldShowKnowledgeGrid = showAddCard || hasKnowledgeResults;

  const masonryRef = React.useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = masonryRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const next = Math.max(
        1,
        Math.floor((width + MASONRY_COL_GAP) / (MASONRY_MIN_COL_WIDTH + MASONRY_COL_GAP)),
      );
      setColumnCount((prev) => (prev === next ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldShowKnowledgeGrid, isLoading]);

  const masonryColumns = React.useMemo(() => {
    type MasonryEntry =
      | { kind: 'add' }
      | { kind: 'card'; item: KnowledgeListItem; index: number };

    const cols = Math.max(1, columnCount);
    const buckets: MasonryEntry[][] = Array.from({ length: cols }, () => []);
    const heights = new Array<number>(cols).fill(0);

    if (showAddCard) {
      buckets[0].push({ kind: 'add' });
      heights[0] += 210 + MASONRY_COL_GAP;
    }

    knowledgeItems.forEach((item, index) => {
      let targetCol = 0;
      for (let c = 1; c < cols; c += 1) {
        if (heights[c] < heights[targetCol]) {
          targetCol = c;
        }
      }
      buckets[targetCol].push({ kind: 'card', item, index });
      heights[targetCol] += estimateMasonryCardHeight(item) + MASONRY_COL_GAP;
    });

    return buckets;
  }, [columnCount, knowledgeItems, showAddCard]);

  React.useEffect(() => {
    setSelectedIds([]);
  }, [search, selectedSpaceTagId, selectedTagIds, isManagementView]);

  React.useEffect(() => {
    if (!hasSelection) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIds([]);
        setIsTagPopoverOpen(false);
        setIsSpacePopoverOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSelection]);

  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const allLoadedSelected = allLoadedKnowledgeIds.length > 0 && allLoadedKnowledgeIds.every((id) => selectedIdSet.has(id));

  const toggleSelectAllLoaded = () => {
    setSelectedIds(allLoadedSelected ? [] : allLoadedKnowledgeIds);
  };

  const toggleSelectCard = React.useCallback((id: number) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  }, []);

  const openDetailModal = React.useCallback((
    knowledgeId: number,
    startInFocus = false,
  ) => {
    setModalState({ kind: 'detail', knowledgeId, startInFocus });
  }, []);

  const syncDetailHash = React.useCallback((knowledgeId: number | null) => {
    const nextHash = knowledgeId ? `#${knowledgeId}` : '';
    if (location.hash === nextHash) return;
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: nextHash,
      },
      { replace: true },
    );
  }, [navigate, location.pathname, location.search, location.hash]);

  const handleOpenKnowledge = (id: number, startInFocus = false) => {
    if (!isManagementView) {
      incrementViewCount.mutate(id);
    }
    openDetailModal(id, startInFocus);
    syncDetailHash(id);
  };

  React.useEffect(() => {
    if (isCreateRoute) {
      setModalState((prev) => (
        prev?.kind === 'create'
          ? prev
          : { kind: 'create', initialSpaceTagId: selectedSpaceTagId }
      ));
      return;
    }
    if (routeKnowledgeIdNumber && Number.isFinite(routeKnowledgeIdNumber)) {
      openDetailModal(routeKnowledgeIdNumber);
      return;
    }
    if (hashKnowledgeId && Number.isFinite(hashKnowledgeId)) {
      openDetailModal(hashKnowledgeId);
      return;
    }
    setModalState(null);
  }, [hashKnowledgeId, isCreateRoute, openDetailModal, routeKnowledgeIdNumber, selectedSpaceTagId]);

  const navigateFromLegacyRoute = React.useCallback(() => {
    if (fromDashboard) {
      navigate(ROUTES.DASHBOARD);
      return;
    }
    if (taskId > 0) {
      navigate(`${ROUTES.TASKS}/${taskId}`);
      return;
    }
    navigate(ROUTES.KNOWLEDGE);
  }, [fromDashboard, taskId, navigate]);

  const dismissDetailModal = React.useCallback(() => {
    setModalState(null);
    if (routeKnowledgeIdNumber) {
      navigateFromLegacyRoute();
      return;
    }
    syncDetailHash(null);
  }, [navigateFromLegacyRoute, routeKnowledgeIdNumber, syncDetailHash]);

  const detailModalState = modalState?.kind === 'detail' ? modalState : null;

  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteKnowledge.mutateAsync(deleteTarget);
      toast.success('删除成功');
    } catch (error) {
      showApiError(error, '删除失败');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleQuickSave = React.useCallback(async (payload: {
    title: string;
    externalDocUrl: string;
    content: string;
  }) => {
    if (!payload.externalDocUrl.trim() && !payload.content.trim() && !payload.title.trim()) return;

    try {
      await createKnowledge.mutateAsync({
        content: payload.content,
        ...(payload.externalDocUrl.trim() && { external_doc_url: payload.externalDocUrl.trim() }),
        ...(payload.title && { title: payload.title }),
        ...(selectedSpaceTagId !== undefined && { space_tag_id: selectedSpaceTagId }),
      });

      toast.success('知识创建成功');
    } catch (error) {
      showApiError(error, '创建失败');
      throw error;
    }
  }, [createKnowledge, selectedSpaceTagId]);

  const handleBulkMoveSpace = async (targetSpaceId: number | null) => {
    if (selectedIds.length === 0 || bulkUpdateKnowledge.isPending) return;
    try {
      const res = await bulkUpdateKnowledge.mutateAsync({
        ids: selectedIds,
        update_space: true,
        space_tag_id: targetSpaceId,
      });
      toast.success(`已更新 ${res.updated} 篇知识的空间`);
      setIsSpacePopoverOpen(false);
      setSelectedIds([]);
    } catch (error) {
      showApiError(error, '批量移动空间失败');
    }
  };

  const handleBulkAddTag = async (tagId: number) => {
    if (selectedIds.length === 0 || bulkUpdateKnowledge.isPending) return;
    try {
      const res = await bulkUpdateKnowledge.mutateAsync({
        ids: selectedIds,
        add_tag_ids: [tagId],
      });
      toast.success(`已为 ${res.updated} 篇知识添加标签`);
      setIsTagPopoverOpen(false);
      setSelectedIds([]);
    } catch (error) {
      showApiError(error, '批量添加标签失败');
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteKnowledge.mutateAsync({ ids: selectedIds });
      toast.success(`已删除 ${res.deleted} 篇知识`);
      setSelectedIds([]);
      setIsBulkDeleteConfirmOpen(false);
    } catch (error) {
      showApiError(error, '批量删除失败');
    }
  };

  const handleCreateSpaceAndMove = React.useCallback(async (
    { name, color }: { name: string; color: string },
  ) => {
    try {
      const created = await createTag.mutateAsync({ name, tag_type: 'SPACE', color });
      const res = await bulkUpdateKnowledge.mutateAsync({
        ids: selectedIds,
        update_space: true,
        space_tag_id: created.id,
      });
      toast.success(`已创建空间并移入 ${res.updated} 篇知识`);
      setIsSpacePopoverOpen(false);
      setSelectedIds([]);
    } catch (error) {
      showApiError(error, '添加失败');
    }
  }, [bulkUpdateKnowledge, createTag, selectedIds]);

  const handleSetPinned = React.useCallback(async (item: KnowledgeListItem, isPinned: boolean) => {
    setPendingPinOverrides((prev) => ({
      ...prev,
      [item.id]: isPinned ? { ...item, is_pinned: true } : null,
    }));
    try {
      await updateKnowledge.mutateAsync({ id: item.id, data: { is_pinned: isPinned } });
      toast.success(isPinned ? '已置顶' : '已取消置顶');
    } catch (error) {
      showApiError(error, isPinned ? '置顶失败' : '取消置顶失败');
    } finally {
      setPendingPinOverrides((prev) => {
        if (!(item.id in prev)) return prev;
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }, [updateKnowledge]);

  const handleUpdateCardTags = React.useCallback(async (
    item: KnowledgeListItem,
    nextTags: SimpleTag[],
  ) => {
    try {
      await updateKnowledge.mutateAsync({
        id: item.id,
        data: { tag_ids: nextTags.map((t) => t.id) },
      });
    } catch (error) {
      showApiError(error, '更新标签失败');
    }
  }, [updateKnowledge]);

  const handleSelectCardSpace = React.useCallback(async (
    item: KnowledgeListItem,
    spaceId: number | null,
  ) => {
    if ((item.space_tag?.id ?? null) === spaceId) return;
    try {
      await updateKnowledge.mutateAsync({
        id: item.id,
        data: { space_tag_id: spaceId },
      });
      toast.success(spaceId ? '空间已更新' : '已取消空间');
    } catch (error) {
      showApiError(error, '更新空间失败');
    }
  }, [updateKnowledge]);

  const handleCreateSpaceForCard = React.useCallback(async (
    item: KnowledgeListItem,
    { name, color }: { name: string; color: string },
  ) => {
    try {
      const created = await createTag.mutateAsync({ name, tag_type: 'SPACE', color });
      await updateKnowledge.mutateAsync({
        id: item.id,
        data: { space_tag_id: created.id },
      });
      toast.success('已创建空间并移入');
    } catch (error) {
      showApiError(error, '创建空间失败');
    }
  }, [createTag, updateKnowledge]);

  const handleContextMenuCard = React.useCallback((
    event: React.MouseEvent,
    item: KnowledgeListItem,
  ) => {
    event.preventDefault();
    setContextMenu({
      item: { ...item, is_pinned: pinnedIdSet.has(item.id) || Boolean(item.is_pinned) },
      x: event.clientX,
      y: event.clientY,
    });
  }, [pinnedIdSet]);

  React.useLayoutEffect(() => {
    const el = spaceBarRef.current;
    if (!el) return;
    const sync = () => {
      const next = Math.floor(el.clientWidth);
      if (next > 0) setSpaceBarWidth(next);
    };
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { visibleSpaceTags, overflowSpaceTags } = React.useMemo(() => {
    if (spaceTags.length === 0) {
      return { visibleSpaceTags: [] as TagType[], overflowSpaceTags: [] as TagType[] };
    }
    const availableWidth = spaceBarWidth > 0 ? spaceBarWidth : 1080;
    const selectedTagChipWidth = selectedTags.length > 0
      ? Math.min(
          152,
          Math.ceil(
            estimateInlineTextWidth(`#${selectedTags[0].name}`, 12)
              + (selectedTags.length > 1 ? 26 : 0),
          ),
        ) + 38
      : 0;

    const allPillWidth = estimateSpacePillWidth(
      '全部',
      spaceFilter === 'all' ? selectedTagChipWidth : 0,
    );
    const widthOf = (tag: TagType) => estimateSpacePillWidth(
      tag.name,
      spaceFilter === tag.id ? selectedTagChipWidth : 0,
    );

    // 优先检查能否全部铺满单行
    let allTotal = allPillWidth;
    for (const tag of spaceTags) {
      allTotal += SPACE_PILL_GAP + widthOf(tag);
    }
    if (allTotal <= availableWidth) {
      return { visibleSpaceTags: spaceTags, overflowSpaceTags: [] as TagType[] };
    }

    // 超出单行时，按实测宽度为「更多空间」预留位置，尽量铺满当前行
    const budget = availableWidth - allPillWidth - MORE_SPACES_BTN_WIDTH - SPACE_PILL_GAP;
    const activeHiddenIdx = typeof spaceFilter === 'number'
      ? spaceTags.findIndex((t) => t.id === spaceFilter)
      : -1;

    const fitPrefix = (list: TagType[], limitWidth: number) => {
      const fitted: TagType[] = [];
      let used = 0;
      for (const tag of list) {
        const w = SPACE_PILL_GAP + widthOf(tag);
        if (used + w <= limitWidth) {
          fitted.push(tag);
          used += w;
        } else {
          break;
        }
      }
      return { fitted, used };
    };

    const initial = fitPrefix(spaceTags, budget);
    if (activeHiddenIdx !== -1 && activeHiddenIdx >= initial.fitted.length) {
      const activeSpace = spaceTags[activeHiddenIdx];
      const activeCost = SPACE_PILL_GAP + widthOf(activeSpace);
      const others = spaceTags.filter((_, idx) => idx !== activeHiddenIdx);
      const { fitted } = fitPrefix(others, budget - activeCost);
      const visible = [...fitted, activeSpace];
      const visibleIds = new Set(visible.map((t) => t.id));
      return {
        visibleSpaceTags: visible,
        overflowSpaceTags: spaceTags.filter((t) => !visibleIds.has(t.id)),
      };
    }

    return {
      visibleSpaceTags: initial.fitted,
      overflowSpaceTags: spaceTags.slice(initial.fitted.length),
    };
  }, [selectedTags, spaceBarWidth, spaceFilter, spaceTags]);

  return (
    <div
      className="-mx-8 -mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
    >
      {/* 顶部固定工具区：物理独立于下方滚动区，彻底杜绝卡片顶出、压盖搜索栏或下滑消失 */}
      <div className="relative z-20 shrink-0 space-y-2.5 border-b border-black/[0.05] bg-[#F6F8FC] px-8 pt-2 pb-3">
        {/* 1. 顶部搜索栏 / 选中时原位切换为极简批量操作条（等高不跳动、宽度对齐） */}
        <div className="flex min-h-[44px] w-full items-center">
        {hasSelection ? (
          <div className="grid h-[44px] w-full grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[6px] bg-white px-5 shadow-[0_6px_24px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3 justify-self-start text-[13px] leading-none text-foreground">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                已选中 <strong className="font-semibold text-primary">{selectedIds.length} 篇知识</strong>
              </span>
              <button
                type="button"
                onClick={toggleSelectAllLoaded}
                className="inline-flex cursor-pointer items-center whitespace-nowrap text-[13px] leading-none font-medium text-text-muted transition-colors hover:text-primary"
              >
                {allLoadedSelected ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="flex items-center gap-6 justify-self-center">
              {canUpdateKnowledge && (
                <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={bulkUpdateKnowledge.isPending}
                      className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-foreground transition-colors hover:text-primary disabled:opacity-50"
                    >
                      <Hash className="h-4 w-4 text-foreground/75" strokeWidth={1.8} />
                      <span>添加标签</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="center" sideOffset={12} className="w-72 rounded-[6px] bg-[#f4f6f9] p-3 pb-0 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                    <TagInput
                      applicableTo="knowledge"
                      selectedTags={[]}
                      hideChips
                      onAdd={(tag) => void handleBulkAddTag(tag.id)}
                      onRemove={() => {}}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {canUpdateKnowledge && (
                <Popover open={isSpacePopoverOpen} onOpenChange={setIsSpacePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={bulkUpdateKnowledge.isPending}
                      className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-foreground transition-colors hover:text-primary disabled:opacity-50"
                    >
                      <Circle className="h-4 w-4 text-foreground/75" strokeWidth={1.8} />
                      <span>移至空间</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="center" sideOffset={12} className="w-56 overflow-hidden rounded-[6px] border-0 p-0 shadow-[0_8px_28px_rgba(0,0,0,0.13)]">
                    <SpacePickerList
                      spaces={spaceTags}
                      showUnassign
                      canCreate={canCreateTag}
                      disabled={bulkUpdateKnowledge.isPending || createTag.isPending}
                      onSelect={handleBulkMoveSpace}
                      onCreate={handleCreateSpaceAndMove}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {canDeleteKnowledge && (
                <button
                  type="button"
                  disabled={bulkDeleteKnowledge.isPending}
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] font-medium text-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span>删除知识</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex cursor-pointer items-center justify-self-end whitespace-nowrap text-[13px] leading-none font-medium tracking-wider text-text-muted transition-colors hover:text-foreground"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-4">
            <div className="flex h-[42px] min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-black/[0.08] bg-white px-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all duration-150 focus-within:border-primary/45 focus-within:shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
              <Search
                className="h-4 w-4 shrink-0 text-[#8a94a3]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearch(searchValue.trim());
                }}
                placeholder="搜索知识标题、故障现象、执行步骤或标签…"
                aria-label="搜索知识"
                className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[14px] text-foreground outline-none placeholder:text-[#9aa3b2]"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('');
                    setSearch('');
                  }}
                  aria-label="清空搜索"
                  className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-black/[0.06] p-0 text-[#64748b] transition-colors hover:bg-black/[0.12] hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {isManagementView && (canCreateKnowledge || canDeleteKnowledge) && (
              <div className="flex shrink-0 items-center gap-1">
                <KnowledgeXlsxActions
                  canImport={canCreateKnowledge}
                  canDelete={canDeleteKnowledge}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. 筛选区：按实际可用宽度动态铺满单行，超出空间收进「更多」浮层，点击任意空间弹出二级分类标签 */}
      <div className="flex items-center justify-between gap-3">
        <div ref={spaceBarRef} className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
          {[
            { key: 'all' as const, name: '全部', color: 'var(--theme-primary)' },
            ...visibleSpaceTags.map((tag: TagType) => ({
              key: tag.id as number,
              name: tag.name,
              color: tag.color || 'var(--theme-primary)',
            })),
          ].map((space) => {
            const isSelected = spaceFilter === space.key;
            const isPopoverOpen = openTagPopoverKey === space.key && knowledgeTags.length > 0;

            return (
              <Popover
                key={space.key}
                open={isPopoverOpen}
                onOpenChange={(nextOpen) => {
                  if (!nextOpen && openTagPopoverKey === space.key) {
                    setOpenTagPopoverKey(null);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleSpacePillClick(space.key)}
                    onMouseEnter={() => {
                      if (openTagPopoverKey === space.key) {
                        cancelCloseTagPopover();
                      }
                    }}
                    onMouseLeave={() => {
                      if (openTagPopoverKey === space.key) {
                        scheduleCloseTagPopover();
                      }
                    }}
                    className={SPACE_PILL_BUTTON_CLASS}
                    style={isSelected ? { boxShadow: SPACE_PILL_HOVER_SHADOW } : undefined}
                  >
                    <SelectionIndicator
                      color={space.color}
                      selected={isSelected}
                      size={14}
                      className="transition-all"
                    />
                    <span className="max-w-[12rem] truncate text-gray-900 sm:max-w-[14rem]">
                      {space.name}
                    </span>
                    {isSelected && selectedTags.length > 0 && (
                      <>
                        <span className="h-3 w-px bg-foreground/15" aria-hidden="true" />
                        <span
                          className="inline-flex max-w-[9.5rem] items-center gap-0.5 truncate text-[12px] font-semibold"
                          style={{ color: activeTagColor }}
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelCloseTagPopover();
                            setOpenTagPopoverKey(space.key);
                          }}
                          title={selectedTags.map((t) => `#${t.name}`).join(' · ')}
                        >
                          <span>#</span>
                          <span className="truncate">{selectedTags[0].name}</span>
                          {selectedTags.length > 1 && (
                            <span className="ml-0.5 shrink-0 text-[11px] opacity-80">
                              +{selectedTags.length - 1}
                            </span>
                          )}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="清除标签筛选"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTagIds([]);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTagIds([]);
                            }
                          }}
                          className="-mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-text-muted/70 transition-colors hover:bg-black/[0.06] hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>

                {isPopoverOpen ? (
                  <KnowledgeTagFilterPopover
                    tags={knowledgeTags}
                    selectedTagIds={selectedTagIds}
                    activeTagColor={activeTagColor}
                    searchInputRef={tagPopoverSearchRef}
                    onToggleTag={toggleSecondaryTag}
                    onClearTags={() => setSelectedTagIds([])}
                    onMouseEnter={cancelCloseTagPopover}
                    onMouseLeave={scheduleCloseTagPopover}
                  />
                ) : null}
              </Popover>
            );
          })}

          {overflowSpaceTags.length > 0 && (
            <Popover open={moreSpacesOpen} onOpenChange={setMoreSpacesOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(SPACE_PILL_BUTTON_CLASS, 'text-[#64748b]')}
                >
                  <span>更多空间</span>
                  <span className="text-[11px] tabular-nums text-[#94a0ae]">+{overflowSpaceTags.length}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#94a0ae]" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="max-h-[300px] w-[320px] overflow-y-auto rounded-[10px] border border-black/[0.07] bg-white p-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.14)] [scrollbar-width:thin]"
              >
                <div className="flex flex-wrap gap-1.5">
                  {overflowSpaceTags.map((tag: TagType) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setMoreSpacesOpen(false);
                        handleSpacePillClick(tag.id);
                      }}
                      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[7px] border border-black/[0.05] bg-[#f7f9fc] px-2.5 text-[12.5px] font-medium text-gray-800 transition-colors hover:border-black/[0.1] hover:bg-white"
                    >
                      <SelectionIndicator
                        color={tag.color || 'var(--theme-primary)'}
                        selected={false}
                        size={12}
                      />
                      <span className="max-w-[10rem] truncate">{tag.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-[12px] text-text-muted">
          {isManagementView && canBulkOperate && !hasSelection && (
            <span className="hidden text-text-muted/55 sm:inline">Shift + 点击多选</span>
          )}
          <span className="font-medium">
            共 <span className="font-semibold text-foreground">{totalCount}</span> 篇
          </span>
        </div>
      </div>
      </div>

      {/* 下方独立滚动内容区（置顶托盘 + 真瀑布流卡片墙），卡片永远严格限制在工具栏下方 */}
      <div className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto px-8 pt-5 pb-10">
      {/* 3. 顶部置顶托盘（有置顶或管理态拖拽时展示） */}
      <KnowledgePinnedBar
        items={pinnedItems}
        canManage={isManagementView && canUpdateKnowledge}
        draggingItem={draggingCard}
        onOpen={(id) => handleOpenKnowledge(id)}
        onPin={(item) => void handleSetPinned(item, true)}
        onUnpin={(item) => void handleSetPinned(item, false)}
        onContextMenuCard={handleContextMenuCard}
      />

      {/* 真瀑布流卡片区（全员 1 列宽、竖向紧密咬合，按最短列均衡排布，零空洞） */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : shouldShowKnowledgeGrid ? (
          <>
            <div
              ref={masonryRef}
              className="flex items-start"
              style={{ gap: MASONRY_COL_GAP }}
            >
              {masonryColumns.map((colItems, colIdx) => (
                <div
                  key={`masonry-col-${colIdx}`}
                  className="flex min-w-0 flex-1 flex-col"
                  style={{ gap: MASONRY_COL_GAP }}
                >
                  {colItems.map((entry) => {
                    if (entry.kind === 'add') {
                      return (
                        <div
                          key="add-knowledge-card"
                          className={cn(
                            'min-w-0 transition-opacity duration-200',
                            hasSelection && 'pointer-events-none opacity-45',
                            !hasSelection && activePreviewCardId !== null && 'opacity-40',
                          )}
                        >
                          <AddKnowledgeCard
                            onSave={handleQuickSave}
                            onExpand={(payload) => {
                              setModalState({
                                kind: 'create',
                                initialTitle: payload.title,
                                initialContent: payload.content,
                                initialExternalDocUrl: payload.externalDocUrl,
                                initialSpaceTagId: selectedSpaceTagId,
                              });
                            }}
                            isSaving={createKnowledge.isPending}
                          />
                        </div>
                      );
                    }

                    const { item, index } = entry;
                    const isPreviewActive = activePreviewCardId === item.id;
                    const isDimmedByPreview = activePreviewCardId !== null && !isPreviewActive;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'min-w-0 transition-opacity duration-180',
                          isPreviewActive && 'relative z-30',
                          isDimmedByPreview && 'opacity-40',
                        )}
                      >
                        <KnowledgeCardMymind
                          item={item}
                          onClick={(id) => handleOpenKnowledge(id)}
                          onFocusOpen={(id) => handleOpenKnowledge(id, true)}
                          index={index}
                          canSelect={isManagementView && canBulkOperate}
                          selectionActive={hasSelection}
                          selected={selectedIdSet.has(item.id)}
                          selectedIdSet={selectedIdSet}
                          onToggleSelect={toggleSelectCard}
                          canDrag={isManagementView && canUpdateKnowledge && !hasSelection}
                          onDragStartCard={setDraggingCard}
                          onDragEndCard={() => setDraggingCard(null)}
                          onContextMenuCard={handleContextMenuCard}
                          onOverlayOpenChange={(open) => {
                            setActivePreviewCardId((prev) => {
                              if (open) return item.id;
                              return prev === item.id ? null : prev;
                            });
                          }}
                          isOtherPreviewActive={isDimmedByPreview}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {hasKnowledgeResults && (
              <div className="flex flex-col items-center gap-3 pt-8">
                {hasNextPage ? (
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="rounded-full border border-foreground/15 bg-white px-6 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFetchingNextPage ? '加载中…' : '加载更多'}
                  </button>
                ) : (
                  <span className="text-xs text-foreground/35">已加载全部内容</span>
                )}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Inbox}
            description="暂无知识内容"
            className="rounded-2xl bg-muted py-32"
          />
        )}
      </div>
      </div>

      <KnowledgeCardContextMenu
        menu={contextMenu}
        spaces={spaceTags}
        canUpdate={isManagementView && canUpdateKnowledge}
        canCreateSpace={isManagementView && canUpdateKnowledge && canCreateTag}
        canDelete={isManagementView && canDeleteKnowledge}
        isBusy={updateKnowledge.isPending || createTag.isPending}
        onClose={() => setContextMenu(null)}
        onTogglePin={(item) => void handleSetPinned(item, !item.is_pinned)}
        onUpdateTags={handleUpdateCardTags}
        onSelectSpace={handleSelectCardSpace}
        onCreateSpace={handleCreateSpaceForCard}
        onFocusOpen={(id) => handleOpenKnowledge(id, true)}
        onDelete={(id) => setDeleteTarget(id)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="确认删除"
        description="确定要删除该知识文档吗？"
        confirmText="删除"
        confirmVariant="destructive"
        isConfirming={deleteKnowledge.isPending}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={isBulkDeleteConfirmOpen}
        onOpenChange={(open) => { if (!open && !bulkDeleteKnowledge.isPending) setIsBulkDeleteConfirmOpen(false); }}
        title="确认批量删除"
        description={`确定删除选中的 ${selectedIds.length} 篇知识吗？此操作不可恢复。`}
        confirmText="批量删除"
        confirmVariant="destructive"
        isConfirming={bulkDeleteKnowledge.isPending}
        onConfirm={handleConfirmBulkDelete}
      />

      {detailModalState && (
        <KnowledgeDetailModal
          knowledgeId={detailModalState.knowledgeId}
          startInFocus={detailModalState.startInFocus}
          taskKnowledgeId={taskKnowledgeId || undefined}
          learning={learning}
          onClose={dismissDetailModal}
          onSelectKnowledge={(id) => {
            openDetailModal(id, detailModalState.startInFocus);
            syncDetailHash(id);
          }}
          onDelete={(id) => {
            setDeleteTarget(id);
            dismissDetailModal();
          }}
        />
      )}

      {modalState?.kind === 'create' && (
        <KnowledgeDetailModal
          initialTitle={modalState.initialTitle}
          initialContent={modalState.initialContent}
          initialExternalDocUrl={modalState.initialExternalDocUrl}
          initialSpaceTagId={modalState.initialSpaceTagId}
          onClose={() => {
            setModalState(null);
            if (isCreateRoute) {
              navigate(ROUTES.KNOWLEDGE);
            }
          }}
          onCreated={(id) => {
            if (isCreateRoute) {
              navigate(`${ROUTES.KNOWLEDGE}#${id}`);
              return;
            }
            openDetailModal(id);
            syncDetailHash(id);
          }}
        />
      )}

    </div>
  );
};
