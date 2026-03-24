import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Inbox,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/types/api';

import { useInfiniteKnowledgeList } from '../api/knowledge';
import { useCreateKnowledge, useDeleteKnowledge } from '../api/manage-knowledge';
import { useLineTypeTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { getKnowledgeTitleFromHtml } from '../utils/content-utils';
import { hasMeaningfulKnowledgeHtml } from '../utils/slash-shortcuts';
import { KnowledgeCardMymind } from './cards/knowledge-card';
import { AddKnowledgeCard } from './cards/knowledge-add-card';
import { AddKnowledgeModal } from './modals/knowledge-add-modal';
import { KnowledgeDetailModal } from './modals/knowledge-detail-modal';


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
    const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);
    const [showAddModal, setShowAddModal] = React.useState(false);
    const [modalInitialContent, setModalInitialContent] = React.useState('');
    const [detailId, setDetailId] = React.useState<number | null>(null);
    const [detailStartEditing, setDetailStartEditing] = React.useState(false);
    const [detailStartInFocus, setDetailStartInFocus] = React.useState(false);

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
            setShowAddModal(true);
            return;
        }
        if (routeKnowledgeIdNumber && Number.isFinite(routeKnowledgeIdNumber)) {
            setDetailId(routeKnowledgeIdNumber);
            setDetailStartEditing(isEditRoute);
            setDetailStartInFocus(false);
            return;
        }
        if (hashKnowledgeId && Number.isFinite(hashKnowledgeId)) {
            setDetailId(hashKnowledgeId);
            setDetailStartEditing(false);
            setDetailStartInFocus(false);
            return;
        }
        setDetailId(null);
        setDetailStartEditing(false);
        setDetailStartInFocus(false);
    }, [isCreateRoute, routeKnowledgeIdNumber, isEditRoute, hashKnowledgeId]);

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
        setDetailStartEditing(false);
        setDetailStartInFocus(false);
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
        setDetailStartEditing(false);
        setDetailStartInFocus(true);
        setDetailId(id);
        syncDetailHash(id);
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

    return (
        <div
            className="space-y-3"
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
        >
            {/* 搜索栏 — 底部横线样式 */}
            <div className="flex items-center gap-3">
                <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search my mind..."
                    className="flex-1 bg-transparent border-0 border-b border-foreground/15 focus:border-foreground/40 outline-none text-2xl font-light text-foreground/60 placeholder:text-foreground/25 py-3 transition-colors"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
                />
            </div>

            {/* 条线筛选标签 — 白色卡片 */}
            {lineTypeTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {lineTypeTags.map((tag: TagType) => (
                        <button
                            key={tag.id}
                            onClick={() => handleLineTypeSelect(
                                selectedLineTypeId === tag.id ? undefined : tag.id
                            )}
                            className="inline-flex items-center gap-3 px-4 py-2 rounded-[6px] font-medium transition-all bg-white"
                            style={{ fontSize: 12.5 }}
                        >
                            <span className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                selectedLineTypeId === tag.id
                                    ? "border-[#4A90E2] bg-[#4A90E2]"
                                    : "border-[#4A90E2]"
                            )}>
                                {selectedLineTypeId === tag.id && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                            </span>
                            <span className="text-gray-900">
                                {tag.name}
                            </span>
                        </button>
                    ))}
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
                                        setModalInitialContent(content);
                                        setShowAddModal(true);
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
                                        className="px-6 py-2.5 rounded-full border border-foreground/15 bg-white/90 text-foreground/70 text-sm font-medium hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

            <AddKnowledgeModal
                open={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setModalInitialContent('');
                    if (isCreateRoute) {
                        roleNavigate('knowledge');
                    }
                }}
                initialContent={modalInitialContent}
                initialLineTagId={selectedLineTypeId}
                onSuccess={(id) => {
                    refetch();
                    setShowAddModal(false);
                    setModalInitialContent('');
                    setDetailStartEditing(false);
                    setDetailStartInFocus(false);
                    setDetailId(id);
                    if (isCreateRoute) {
                        roleNavigate(`knowledge#${id}`);
                        return;
                    }
                    syncDetailHash(id);
                }}
            />

            {detailId !== null && (
                <KnowledgeDetailModal
                    knowledgeId={detailId}
                    startEditing={detailStartEditing}
                    startInFocus={detailStartInFocus}
                    taskId={taskId || undefined}
                    taskKnowledgeId={taskKnowledgeId || undefined}
                    onClose={() => {
                        setDetailId(null);
                        setDetailStartEditing(false);
                        setDetailStartInFocus(false);
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
                        setDetailStartInFocus(false);
                        if (routeKnowledgeIdNumber) {
                            navigateFromLegacyRoute();
                            return;
                        }
                        syncDetailHash(null);
                    }}
                    onUpdated={() => refetch()}
                />
            )}
        </div>
    );
};
