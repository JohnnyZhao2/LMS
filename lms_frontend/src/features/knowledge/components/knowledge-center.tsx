import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Inbox,
    Search,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { SpaceColorRingPicker, SPACE_THEME_COLORS } from '@/components/common/space-color-ring-picker';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/types/api';

import { useInfiniteKnowledgeList } from '../api/knowledge';
import { useCreateKnowledge, useDeleteKnowledge } from '../api/manage-knowledge';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { getKnowledgeTitleFromHtml } from '../utils/content-utils';
import { hasMeaningfulKnowledgeHtml } from '../utils/slash-shortcuts';
import { useCreateTag, useDeleteTag } from '@/features/tags/api/tags';
import { useSpaceTypeTags } from '../api/get-tags';
import { cn } from '@/lib/utils';
import { KnowledgeCardMymind } from './cards/knowledge-card';
import { AddKnowledgeCard } from './cards/knowledge-add-card';
import { KnowledgeFocusModal } from './modals/knowledge-focus-modal';
import { KnowledgeDetailModal } from './modals/knowledge-detail-modal';

type FocusState =
    | { mode: 'create'; initialContent: string; initialSpaceTagId?: number }
    | { mode: 'detail'; knowledgeId: number; closeOnExitFocus: boolean };

interface KnowledgeCenterProps {
    isAdmin?: boolean;
}

export const KnowledgeCenter: React.FC<KnowledgeCenterProps> = ({ isAdmin = false }) => {
    const { roleNavigate } = useRoleNavigate();
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeKnowledgeId } = useParams<{ id?: string }>();
    const incrementViewCount = useIncrementViewCount();
    const { hasPermission } = useAuth();
    const canCreateKnowledge = hasPermission('knowledge.create');
    const canUpdateKnowledge = hasPermission('knowledge.update');
    const canDeleteKnowledge = hasPermission('knowledge.delete');
    const isManagementView = isAdmin || canCreateKnowledge || canUpdateKnowledge || canDeleteKnowledge;

    const deleteKnowledge = useDeleteKnowledge();
    const createKnowledge = useCreateKnowledge();
    const createTag = useCreateTag();
    const deleteTag = useDeleteTag();
    const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);
    const [deleteSpaceTypeTarget, setDeleteSpaceTypeTarget] = React.useState<number | null>(null);
    const [focusState, setFocusState] = React.useState<FocusState | null>(null);
    const [detailId, setDetailId] = React.useState<number | null>(null);
    const [detailStartEditing, setDetailStartEditing] = React.useState(false);
    const [hoveredSpaceTypeId, setHoveredSpaceTypeId] = React.useState<number | null>(null);
    const [isTypeActionHovered, setIsTypeActionHovered] = React.useState(false);
    const [isCreateSpaceTypeOpen, setIsCreateSpaceTypeOpen] = React.useState(false);
    const [createSpaceTypeStep, setCreateSpaceTypeStep] = React.useState<1 | 2>(1);
    const [newSpaceTypeName, setNewSpaceTypeName] = React.useState('');
    const [selectedSpaceTypeColor, setSelectedSpaceTypeColor] = React.useState<string>(SPACE_THEME_COLORS[0]);

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
    const isEditRoute = location.pathname.endsWith('/edit');

    const {
        search,
        searchValue,
        setSearchValue,
        submitSearch,
        selectedSpaceTypeId,
        handleSpaceTypeSelect,
        pageSize,
    } = useKnowledgeFilters({ defaultPageSize: 24 });

    const { data: spaceTypeTags = [] } = useSpaceTypeTags();
    const selectedSpaceType = React.useMemo(
        () => spaceTypeTags.find((tag) => tag.id === selectedSpaceTypeId),
        [spaceTypeTags, selectedSpaceTypeId],
    );
    const isDeleteSpaceTypeMode = canDeleteKnowledge && !!selectedSpaceType;

    const {
        data,
        isLoading,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteKnowledgeList({
        search: search || undefined,
        space_tag_id: selectedSpaceTypeId,
        pageSize,
    });
    const knowledgeItems = React.useMemo(
        () => (data?.pages ?? []).flatMap((pageData) => pageData.results),
        [data?.pages],
    );
    const totalCount = data?.pages?.[0]?.count ?? 0;
    const hasKnowledgeResults = knowledgeItems.length > 0;
    const shouldShowKnowledgeGrid = canCreateKnowledge || hasKnowledgeResults;

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            submitSearch();
        }
    };

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

    React.useEffect(() => {
        if (isCreateRoute) {
            setFocusState((prev) => (
                prev?.mode === 'create'
                    ? prev
                    : { mode: 'create', initialContent: '', initialSpaceTagId: selectedSpaceTypeId }
            ));
            return;
        }
        if (routeKnowledgeIdNumber && Number.isFinite(routeKnowledgeIdNumber)) {
            setFocusState(null);
            setDetailId(routeKnowledgeIdNumber);
            setDetailStartEditing(isEditRoute);
            return;
        }
        if (hashKnowledgeId && Number.isFinite(hashKnowledgeId)) {
            setFocusState(null);
            setDetailId(hashKnowledgeId);
            setDetailStartEditing(false);
            return;
        }
        setFocusState(null);
        setDetailId(null);
        setDetailStartEditing(false);
    }, [isCreateRoute, routeKnowledgeIdNumber, isEditRoute, hashKnowledgeId, selectedSpaceTypeId]);

    const navigateFromLegacyRoute = React.useCallback(() => {
        if (fromDashboard) {
            roleNavigate('dashboard');
            return;
        }
        if (taskId > 0) {
            roleNavigate(`tasks/${taskId}`);
            return;
        }
        roleNavigate('knowledge');
    }, [fromDashboard, taskId, roleNavigate]);

    const handleView = (id: number) => {
        if (!isManagementView) {
            incrementViewCount.mutate(id, {
                onSuccess: () => {
                    refetch();
                },
            });
        }
        setFocusState(null);
        setDetailStartEditing(false);
        setDetailId(id);
        syncDetailHash(id);
    };

    const handleFocusView = (id: number) => {
        if (!isManagementView) {
            incrementViewCount.mutate(id, {
                onSuccess: () => {
                    refetch();
                },
            });
        }
        setDetailId(null);
        setDetailStartEditing(false);
        setFocusState({ mode: 'detail', knowledgeId: id, closeOnExitFocus: true });
    };

    const confirmDelete = async () => {
        if (deleteTarget === null) return;
        try {
            await deleteKnowledge.mutateAsync(deleteTarget);
            toast.success('删除成功');
        } catch {
            toast.error('删除失败');
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleQuickSave = React.useCallback(async (content: string) => {
        if (!hasMeaningfulKnowledgeHtml(content)) return;

        try {
            const derivedTitle = getKnowledgeTitleFromHtml(content);
            await createKnowledge.mutateAsync({
                content,
                ...(derivedTitle && { title: derivedTitle }),
                ...(selectedSpaceTypeId !== undefined && { space_tag_id: selectedSpaceTypeId }),
            });

            toast.success('知识创建成功');
            refetch();
        } catch (error) {
            toast.error('创建失败');
            throw error;
        }
    }, [createKnowledge, selectedSpaceTypeId, refetch]);

    const handleCreateSpaceType = React.useCallback(async () => {
        const name = newSpaceTypeName.trim();
        if (!name) {
            toast.error('请输入类型名称');
            return;
        }

        try {
            await createTag.mutateAsync({
                name,
                tag_type: 'SPACE',
                color: selectedSpaceTypeColor,
            });
            toast.success('space 已添加');
            setIsCreateSpaceTypeOpen(false);
            setCreateSpaceTypeStep(1);
            setNewSpaceTypeName('');
            setSelectedSpaceTypeColor(SPACE_THEME_COLORS[0]);
        } catch {
            toast.error('添加失败');
        }
    }, [createTag, newSpaceTypeName, selectedSpaceTypeColor]);

            const handleDeleteSpaceType = React.useCallback(async () => {
        if (!deleteSpaceTypeTarget) return;

        try {
            await deleteTag.mutateAsync(deleteSpaceTypeTarget);
            handleSpaceTypeSelect(undefined);
            toast.success('space 已删除');
        } catch {
            toast.error('删除失败');
        } finally {
            setDeleteSpaceTypeTarget(null);
        }
    }, [deleteSpaceTypeTarget, deleteTag, handleSpaceTypeSelect]);

    return (
        <PageShell
            className="pb-4"
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
        >
            <PageHeader
                title="知识中心"
                icon={<Inbox />}
                extra={(
                    <div className="relative w-full md:w-[22rem] lg:w-[28rem]">
                        <Search
                            className="pointer-events-none absolute bottom-[14px] left-0 h-4 w-4 text-foreground/28"
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                        <input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder=""
                            aria-label="搜索知识"
                            className="w-full border-0 border-b border-foreground/15 bg-transparent py-3 pl-12 text-2xl font-light text-foreground/60 outline-none transition-colors focus:border-foreground/40"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
                        />
                    </div>
                )}
            />

            {/* space筛选标签 — 白色卡片 */}
            {(spaceTypeTags.length > 0 || isManagementView) && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        {spaceTypeTags.map((tag: TagType) => (
                            <button
                                key={tag.id}
                                onClick={() => handleSpaceTypeSelect(
                                    selectedSpaceTypeId === tag.id ? undefined : tag.id
                                )}
                                onMouseEnter={() => setHoveredSpaceTypeId(tag.id)}
                                onMouseLeave={() => setHoveredSpaceTypeId((current) => (current === tag.id ? null : current))}
                                className="inline-flex items-center gap-3 rounded-[6px] bg-white px-3 py-2 font-medium transition-[box-shadow] duration-200"
                                style={{
                                    fontSize: 12.5,
                                    boxShadow: hoveredSpaceTypeId === tag.id
                                        ? '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
                                        : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
                                }}
                            >
                                <span
                                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                                    style={{
                                        borderColor: tag.color || 'var(--theme-primary)',
                                        backgroundColor: selectedSpaceTypeId === tag.id ? (tag.color || 'var(--theme-primary)') : 'transparent',
                                    }}
                                >
                                    {selectedSpaceTypeId === tag.id && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </span>
                                <span className="text-gray-900">
                                    {tag.name}
                                </span>
                            </button>
                        ))}

                        {spaceTypeTags.length === 0 && isManagementView && (
                            <span className="px-4 py-2 text-sm text-text-muted">
                                暂无space
                            </span>
                        )}
                    </div>

                    {isManagementView && (
                        <button
                            type="button"
                            onClick={() => {
                                if (isDeleteSpaceTypeMode && selectedSpaceType) {
                                    setDeleteSpaceTypeTarget(selectedSpaceType.id);
                                    return;
                                }
                                setIsCreateSpaceTypeOpen(true);
                            }}
                            onMouseEnter={() => setIsTypeActionHovered(true)}
                            onMouseLeave={() => setIsTypeActionHovered(false)}
                            className={cn(
                                'inline-flex items-center rounded-full px-4 py-2 font-medium transition-[background-color,box-shadow,color] duration-200',
                                isDeleteSpaceTypeMode
                                    ? 'bg-destructive text-white'
                                    : 'gap-3 bg-white text-foreground',
                            )}
                            style={{
                                fontSize: 12.5,
                                boxShadow: isTypeActionHovered
                                    ? (
                                        isDeleteSpaceTypeMode
                                            ? '0 14px 28px rgba(220,38,38,0.26)'
                                            : '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
                                    )
                                    : (
                                        isDeleteSpaceTypeMode
                                            ? '0 10px 24px rgba(220,38,38,0.18)'
                                            : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)'
                                    ),
                            }}
                        >
                            {!isDeleteSpaceTypeMode && (
                                <span className="h-4 w-4 rounded-full border-2 border-accent" />
                            )}
                            {isDeleteSpaceTypeMode ? '删除此类型' : '添加空间'}
                        </button>
                    )}
                </div>
            )}

            {/* 知识卡片区 */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <span className="font-semibold text-text-muted" style={{ fontSize: 12.5 }}>
                        找到 <span className="text-foreground font-bold">{totalCount}</span> 篇相关知识
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner size="lg" />
                    </div>
                ) : shouldShowKnowledgeGrid ? (
                    <>
                        <div
                            style={{
                                columns: '280px',
                                columnGap: 25,
                            }}
                        >
                            {canCreateKnowledge && (
                                <AddKnowledgeCard
                                    onSave={handleQuickSave}
                                    onExpand={(content) => {
                                        setDetailId(null);
                                        setDetailStartEditing(false);
                                        setFocusState({
                                            mode: 'create',
                                            initialContent: content,
                                            initialSpaceTagId: selectedSpaceTypeId,
                                        });
                                    }}
                                    isSaving={createKnowledge.isPending}
                                />
                            )}
                            {knowledgeItems.map((item, index) => (
                                <KnowledgeCardMymind
                                    key={item.id}
                                    item={item}
                                    onClick={handleView}
                                    onFocusOpen={handleFocusView}
                                    index={index}
                                />
                            ))}
                        </div>

                        {hasKnowledgeResults && (
                            <div className="flex flex-col items-center gap-3 pt-8">
                                {hasNextPage ? (
                                    <button
                                        onClick={() => void fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="px-6 py-2.5 rounded-full border border-foreground/15 bg-white text-foreground/70 text-sm font-medium hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                        className="py-32 bg-muted rounded-2xl"
                    />
                )}
            </div>

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
                open={deleteSpaceTypeTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteSpaceTypeTarget(null); }}
                title="确认删除此类型吗？"
                description={selectedSpaceType
                    ? `删除“${selectedSpaceType.name}”不会删除知识卡片，只会删除此类型。`
                    : '删除此类型不会删除知识卡片，只会删除此类型。'}
                confirmText="删除此类型"
                confirmVariant="destructive"
                isConfirming={deleteTag.isPending}
                onConfirm={handleDeleteSpaceType}
            />

            {detailId !== null && (
                <KnowledgeDetailModal
                    knowledgeId={detailId}
                    startEditing={detailStartEditing}
                    taskId={taskId || undefined}
                    taskKnowledgeId={taskKnowledgeId || undefined}
                    onFocusOpen={(id) => {
                        setFocusState({ mode: 'detail', knowledgeId: id, closeOnExitFocus: false });
                    }}
                    onClose={() => {
                        setDetailId(null);
                        setDetailStartEditing(false);
                        if (routeKnowledgeIdNumber) {
                            navigateFromLegacyRoute();
                            return;
                        }
                        syncDetailHash(null);
                    }}
                    onDelete={(id) => {
                        setDeleteTarget(id);
                        setDetailId(null);
                        setDetailStartEditing(false);
                        if (routeKnowledgeIdNumber) {
                            navigateFromLegacyRoute();
                            return;
                        }
                        syncDetailHash(null);
                    }}
                    onUpdated={() => refetch()}
                />
            )}

            {focusState && (
                <KnowledgeFocusModal
                    mode={focusState.mode}
                    knowledgeId={focusState.mode === 'detail' ? focusState.knowledgeId : undefined}
                    closeOnExitFocus={focusState.mode === 'detail' ? focusState.closeOnExitFocus : undefined}
                    initialContent={focusState.mode === 'create' ? focusState.initialContent : undefined}
                    initialSpaceTagId={focusState.mode === 'create' ? focusState.initialSpaceTagId : undefined}
                    taskId={taskId || undefined}
                    taskKnowledgeId={taskKnowledgeId || undefined}
                    onClose={() => {
                        const currentState = focusState;
                        setFocusState(null);
                        if (isCreateRoute) {
                            roleNavigate('knowledge');
                            return;
                        }
                        if (currentState.mode === 'detail' && currentState.closeOnExitFocus) {
                            syncDetailHash(null);
                        }
                    }}
                    onDelete={(id) => {
                        setDeleteTarget(id);
                        setFocusState(null);
                        if (routeKnowledgeIdNumber) {
                            navigateFromLegacyRoute();
                            return;
                        }
                        syncDetailHash(null);
                    }}
                    onCreated={(id) => {
                        refetch();
                        setFocusState(null);
                        setDetailStartEditing(false);
                        setDetailId(id);
                        if (isCreateRoute) {
                            roleNavigate(`knowledge#${id}`);
                            return;
                        }
                        syncDetailHash(id);
                    }}
                    onUpdated={() => refetch()}
                />
            )}

            <Dialog
                open={isCreateSpaceTypeOpen}
                onOpenChange={(open) => {
                    setIsCreateSpaceTypeOpen(open);
                    if (open) {
                        setCreateSpaceTypeStep(1);
                    } else {
                        setCreateSpaceTypeStep(1);
                        setNewSpaceTypeName('');
                        setSelectedSpaceTypeColor(SPACE_THEME_COLORS[0]);
                    }
                }}
            >
                <DialogContent className="max-w-[560px] overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(232,121,58,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(251,251,250,0.99))] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                    <div className="relative px-7 py-8 sm:px-10 sm:py-9">
                        <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-[rgba(232,121,58,0.08)] blur-2xl" />
                        <div className="pointer-events-none absolute right-0 top-6 h-20 w-20 rounded-full bg-[rgba(37,99,235,0.06)] blur-2xl" />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(232,121,58,0),rgba(232,121,58,0.55),rgba(37,99,235,0.32),rgba(37,99,235,0))]" />
                        {createSpaceTypeStep === 1 ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-5 h-12 w-12">
                                    <span className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-primary-300" />
                                    <span className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[2.5px] border-secondary-300" />
                                    <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[2.5px] border-destructive-300" />
                                    <span className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-primary-600" />
                                </div>

                                <DialogTitle className="text-center text-[30px] font-medium leading-none tracking-[-0.03em] text-foreground sm:text-[34px]">
                                    创建新类型
                                </DialogTitle>
                                <DialogDescription className="mt-4 max-w-[360px] text-center text-[14px] leading-[1.8] text-text-muted sm:text-[15px]">
                                    空间是你脑海中卡片的集合。你可以直接上传卡片到空间中，也可以从概览中选择一张卡片。
                                </DialogDescription>

                                <div className="mt-7 w-full max-w-[360px]">
                                    <input
                                        id="line-type-name"
                                        value={newSpaceTypeName}
                                        onChange={(e) => setNewSpaceTypeName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newSpaceTypeName.trim()) {
                                                e.preventDefault();
                                                setCreateSpaceTypeStep(2);
                                            }
                                        }}
                                        placeholder="输入类型名称"
                                        maxLength={20}
                                        autoFocus
                                        className="h-14 w-full rounded-lg border border-border bg-transparent px-5 text-center text-[16px] text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setCreateSpaceTypeStep(2)}
                                    disabled={!newSpaceTypeName.trim()}
                                    className={cn(
                                        'mt-7 rounded-full px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                                        !newSpaceTypeName.trim()
                                            ? 'bg-muted text-foreground'
                                            : 'bg-[#E8793A] text-white hover:bg-[#D96C2F]',
                                    )}
                                >
                                    下一步
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                <DialogTitle className="text-center text-[30px] font-medium leading-none tracking-[-0.03em] text-foreground sm:text-[34px]">
                                    选择主题色
                                </DialogTitle>
                                <DialogDescription className="mt-4 max-w-[360px] text-center text-[14px] leading-[1.8] text-text-muted sm:text-[15px]">
                                    颜色会帮助你更快识别这个类型。先选一个你最顺眼的标记色。
                                </DialogDescription>

                                <SpaceColorRingPicker
                                    value={selectedSpaceTypeColor}
                                    onChange={setSelectedSpaceTypeColor}
                                    className="mt-5"
                                />

                                <div className="mt-5 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCreateSpaceTypeStep(1)}
                                        className={cn(
                                            'w-[110px] rounded-full border border-border px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] text-text-muted transition-colors hover:bg-muted',
                                        )}
                                    >
                                        上一步
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleCreateSpaceType()}
                                        disabled={createTag.isPending || !newSpaceTypeName.trim()}
                                        className={cn(
                                            'w-[110px] rounded-full px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                                            createTag.isPending || !newSpaceTypeName.trim()
                                                ? 'bg-muted text-foreground'
                                                : 'bg-[#E8793A] text-white hover:bg-[#D96C2F]',
                                        )}
                                    >
                                        {createTag.isPending ? '保存中' : '保存'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </PageShell>
    );
};
