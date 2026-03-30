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
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/types/api';

import { useInfiniteKnowledgeList } from '../api/knowledge';
import { useCreateKnowledge, useDeleteKnowledge } from '../api/manage-knowledge';
import { useCreateTag, useDeleteTag, useLineTypeTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { getKnowledgeTitleFromHtml } from '../utils/content-utils';
import { hasMeaningfulKnowledgeHtml } from '../utils/slash-shortcuts';
import { cn } from '@/lib/utils';
import { KnowledgeCardMymind } from './cards/knowledge-card';
import { AddKnowledgeCard } from './cards/knowledge-add-card';
import { KnowledgeFocusModal } from './modals/knowledge-focus-modal';
import { KnowledgeDetailModal } from './modals/knowledge-detail-modal';

type FocusState =
    | { mode: 'create'; initialContent: string; initialLineTagId?: number }
    | { mode: 'detail'; knowledgeId: number; closeOnExitFocus: boolean };

interface KnowledgeCenterProps {
    isAdmin?: boolean;
}

const LINE_TYPE_THEME_COLORS = [
    '#FFE45C',
    '#7A38D6',
    '#F0444F',
    '#63EEB1',
    '#BDC0CF',
    '#FF86A3',
    '#0A0A0A',
    '#28A3D1',
    '#23BE73',
    '#F6D4C8',
    '#2A6CE5',
    '#C8FF00',
    '#FF9966',
    '#B8A9DB',
    '#9DD3DC',
    '#C89AAA',
] as const;


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
    const [deleteLineTypeTarget, setDeleteLineTypeTarget] = React.useState<number | null>(null);
    const [focusState, setFocusState] = React.useState<FocusState | null>(null);
    const [detailId, setDetailId] = React.useState<number | null>(null);
    const [detailStartEditing, setDetailStartEditing] = React.useState(false);
    const [hoveredLineTypeId, setHoveredLineTypeId] = React.useState<number | null>(null);
    const [isTypeActionHovered, setIsTypeActionHovered] = React.useState(false);
    const [isCreateLineTypeOpen, setIsCreateLineTypeOpen] = React.useState(false);
    const [createLineTypeStep, setCreateLineTypeStep] = React.useState<1 | 2>(1);
    const [newLineTypeName, setNewLineTypeName] = React.useState('');
    const [selectedLineTypeColor, setSelectedLineTypeColor] = React.useState<string>(LINE_TYPE_THEME_COLORS[0]);

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
        selectedLineTypeId,
        handleLineTypeSelect,
        pageSize,
    } = useKnowledgeFilters({ defaultPageSize: 24 });

    const { data: lineTypeTags = [] } = useLineTypeTags();
    const selectedLineType = React.useMemo(
        () => lineTypeTags.find((tag) => tag.id === selectedLineTypeId),
        [lineTypeTags, selectedLineTypeId],
    );
    const isDeleteLineTypeMode = canDeleteKnowledge && !!selectedLineType;

    const {
        data,
        isLoading,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteKnowledgeList({
        search: search || undefined,
        line_tag_id: selectedLineTypeId,
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
                    : { mode: 'create', initialContent: '', initialLineTagId: selectedLineTypeId }
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
    }, [isCreateRoute, routeKnowledgeIdNumber, isEditRoute, hashKnowledgeId, selectedLineTypeId]);

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
                ...(selectedLineTypeId !== undefined && { line_tag_id: selectedLineTypeId }),
            });

            toast.success('知识创建成功');
            refetch();
        } catch (error) {
            toast.error('创建失败');
            throw error;
        }
    }, [createKnowledge, selectedLineTypeId, refetch]);

    const handleCreateLineType = React.useCallback(async () => {
        const name = newLineTypeName.trim();
        if (!name) {
            toast.error('请输入类型名称');
            return;
        }

        try {
            await createTag.mutateAsync({
                name,
                tag_type: 'LINE',
                color: selectedLineTypeColor,
            });
            toast.success('条线类型已添加');
            setIsCreateLineTypeOpen(false);
            setCreateLineTypeStep(1);
            setNewLineTypeName('');
            setSelectedLineTypeColor(LINE_TYPE_THEME_COLORS[0]);
        } catch {
            toast.error('添加失败');
        }
    }, [createTag, newLineTypeName, selectedLineTypeColor]);

    const handleDeleteLineType = React.useCallback(async () => {
        if (!deleteLineTypeTarget) return;

        try {
            await deleteTag.mutateAsync(deleteLineTypeTarget);
            handleLineTypeSelect(undefined);
            toast.success('条线类型已删除');
        } catch {
            toast.error('删除失败');
        } finally {
            setDeleteLineTypeTarget(null);
        }
    }, [deleteLineTypeTarget, deleteTag, handleLineTypeSelect]);

    return (
        <div
            className="space-y-3"
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
        >
            {/* 搜索栏 — 底部横线样式 */}
            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-0 bottom-[14px] h-4 w-4 text-foreground/28"
                    strokeWidth={1.8}
                    aria-hidden="true"
                />
                <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder=""
                    aria-label="搜索知识"
                    className="w-full bg-transparent border-0 border-b border-foreground/15 focus:border-foreground/40 outline-none pl-12 text-2xl font-light text-foreground/60 py-3 transition-colors"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
                />
            </div>

            {/* 条线筛选标签 — 白色卡片 */}
            {(lineTypeTags.length > 0 || isManagementView) && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        {lineTypeTags.map((tag: TagType) => (
                            <button
                                key={tag.id}
                                onClick={() => handleLineTypeSelect(
                                    selectedLineTypeId === tag.id ? undefined : tag.id
                                )}
                                onMouseEnter={() => setHoveredLineTypeId(tag.id)}
                                onMouseLeave={() => setHoveredLineTypeId((current) => (current === tag.id ? null : current))}
                                className="inline-flex items-center gap-3 rounded-[6px] bg-white px-3 py-2 font-medium transition-[box-shadow] duration-200"
                                style={{
                                    fontSize: 12.5,
                                    boxShadow: hoveredLineTypeId === tag.id
                                        ? '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
                                        : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
                                }}
                            >
                                <span
                                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                                    style={{
                                        borderColor: tag.color || '#4A90E2',
                                        backgroundColor: selectedLineTypeId === tag.id ? (tag.color || '#4A90E2') : 'transparent',
                                    }}
                                >
                                    {selectedLineTypeId === tag.id && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </span>
                                <span className="text-gray-900">
                                    {tag.name}
                                </span>
                            </button>
                        ))}

                        {lineTypeTags.length === 0 && isManagementView && (
                            <span className="px-4 py-2 text-sm text-text-muted">
                                暂无条线类型
                            </span>
                        )}
                    </div>

                    {isManagementView && (
                        <button
                            type="button"
                            onClick={() => {
                                if (isDeleteLineTypeMode && selectedLineType) {
                                    setDeleteLineTypeTarget(selectedLineType.id);
                                    return;
                                }
                                setIsCreateLineTypeOpen(true);
                            }}
                            onMouseEnter={() => setIsTypeActionHovered(true)}
                            onMouseLeave={() => setIsTypeActionHovered(false)}
                            className={cn(
                                'inline-flex items-center rounded-full px-4 py-2 font-medium transition-[background-color,box-shadow,color] duration-200',
                                isDeleteLineTypeMode
                                    ? 'bg-destructive text-white'
                                    : 'gap-3 bg-white text-foreground',
                            )}
                            style={{
                                fontSize: 12.5,
                                boxShadow: isTypeActionHovered
                                    ? (
                                        isDeleteLineTypeMode
                                            ? '0 14px 28px rgba(220,38,38,0.26)'
                                            : '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
                                    )
                                    : (
                                        isDeleteLineTypeMode
                                            ? '0 10px 24px rgba(220,38,38,0.18)'
                                            : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)'
                                    ),
                            }}
                        >
                            {!isDeleteLineTypeMode && (
                                <span
                                    className="h-4 w-4 rounded-full border-2"
                                    style={{ borderColor: '#e8793a' }}
                                />
                            )}
                            {isDeleteLineTypeMode ? '删除此类型' : '添加类型'}
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
                                            initialLineTagId: selectedLineTypeId,
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
                        className="py-32 bg-muted rounded-lg"
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
                open={deleteLineTypeTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteLineTypeTarget(null); }}
                title="确认删除此类型吗？"
                description={selectedLineType
                    ? `删除“${selectedLineType.name}”不会删除知识卡片，只会删除此类型。`
                    : '删除此类型不会删除知识卡片，只会删除此类型。'}
                confirmText="删除此类型"
                confirmVariant="destructive"
                isConfirming={deleteTag.isPending}
                onConfirm={handleDeleteLineType}
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
                    initialLineTagId={focusState.mode === 'create' ? focusState.initialLineTagId : undefined}
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
                open={isCreateLineTypeOpen}
                onOpenChange={(open) => {
                    setIsCreateLineTypeOpen(open);
                    if (open) {
                        setCreateLineTypeStep(1);
                    } else {
                        setCreateLineTypeStep(1);
                        setNewLineTypeName('');
                        setSelectedLineTypeColor(LINE_TYPE_THEME_COLORS[0]);
                    }
                }}
            >
                <DialogContent className="max-w-[560px] border-0 bg-[#fcfbf8] p-0 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
                    <div className="px-7 py-8 sm:px-10 sm:py-9">
                        {createLineTypeStep === 1 ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-5 h-12 w-12">
                                    <span className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-[#9bd1d8]" />
                                    <span className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[2.5px] border-[#c8ff00]" />
                                    <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[2.5px] border-[#ff8aa0]" />
                                    <span className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-[#2a6ce5]" />
                                </div>

                                <DialogTitle className="text-center text-[30px] font-medium leading-none tracking-[-0.03em] text-[#44526d] sm:text-[34px]">
                                    创建新类型
                                </DialogTitle>
                                <DialogDescription className="mt-4 max-w-[360px] text-center text-[14px] leading-[1.8] text-[#6f81a0] sm:text-[15px]">
                                    空间是你脑海中卡片的集合。你可以直接上传卡片到空间中，也可以从概览中选择一张卡片。
                                </DialogDescription>

                                <div className="mt-7 w-full max-w-[360px]">
                                    <input
                                        id="line-type-name"
                                        value={newLineTypeName}
                                        onChange={(e) => setNewLineTypeName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newLineTypeName.trim()) {
                                                e.preventDefault();
                                                setCreateLineTypeStep(2);
                                            }
                                        }}
                                        placeholder="输入类型名称"
                                        maxLength={20}
                                        autoFocus
                                        className="h-14 w-full rounded-[12px] border border-[#d8e1ee] bg-transparent px-5 text-center text-[16px] text-[#667999] outline-none transition-colors placeholder:text-[#8da0be] focus:border-[#c5d3e7]"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setCreateLineTypeStep(2)}
                                    disabled={!newLineTypeName.trim()}
                                    className="mt-7 rounded-full px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                                    style={{
                                        background: !newLineTypeName.trim() ? '#d4d4d4' : '#cfcfcf',
                                    }}
                                >
                                    下一步
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                <DialogTitle className="text-center text-[30px] font-medium leading-none tracking-[-0.03em] text-[#44526d] sm:text-[34px]">
                                    选择主题色
                                </DialogTitle>
                                <DialogDescription className="mt-4 max-w-[360px] text-center text-[14px] leading-[1.8] text-[#6f81a0] sm:text-[15px]">
                                    颜色会帮助你更快识别这个类型。先选一个你最顺眼的标记色。
                                </DialogDescription>

                                <div className="mt-7 grid w-full max-w-[280px] grid-cols-4 justify-items-center gap-x-3 gap-y-3">
                                    {LINE_TYPE_THEME_COLORS.map((color) => {
                                        const isSelected = selectedLineTypeColor === color;
                                        return (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedLineTypeColor(color)}
                                                className="flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-[1.04]"
                                                aria-label={`选择颜色 ${color}`}
                                            >
                                                <span
                                                    className="block h-7 w-7 rounded-full border-[3px]"
                                                    style={{
                                                        borderColor: color,
                                                        boxShadow: isSelected ? `0 0 0 3px ${color}22` : 'none',
                                                    }}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCreateLineTypeStep(1)}
                                        className="rounded-full border border-[#d7deea] px-5 py-2 text-[13px] font-medium text-[#70809e] transition-colors hover:bg-[#f1f4f9]"
                                    >
                                        上一步
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleCreateLineType()}
                                        disabled={createTag.isPending || !newLineTypeName.trim()}
                                        className="rounded-full px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                                        style={{
                                            background: createTag.isPending ? '#d4d4d4' : '#cfcfcf',
                                        }}
                                    >
                                        {createTag.isPending ? '保存中' : '保存'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
