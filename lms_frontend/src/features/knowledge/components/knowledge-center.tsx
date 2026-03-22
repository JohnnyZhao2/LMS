import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Inbox,
    Plus,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/types/api';

import { useKnowledgeList } from '../api/knowledge';
import { useCreateKnowledge, useDeleteKnowledge } from '../api/manage-knowledge';
import { useLineTypeTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { KnowledgeCardMymind } from './knowledge-card-mymind';
import { AddKnowledgeCard } from './add-knowledge-card';
import { AddKnowledgeModal } from './add-knowledge-modal';
import { KnowledgeDetailModal } from './knowledge-detail-modal';


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
        page,
        pageSize,
        handlePageChange,
    } = useKnowledgeFilters({ defaultPageSize: 9 });

    const { data: lineTypeTags = [] } = useLineTypeTags();

    const { data, isLoading, refetch } = useKnowledgeList({
        search: search || undefined,
        line_tag_id: selectedLineTypeId,
        page,
        pageSize,
    });
    const hasKnowledgeResults = Boolean(data?.results?.length);
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
            return;
        }
        if (hashKnowledgeId && Number.isFinite(hashKnowledgeId)) {
            setDetailId(hashKnowledgeId);
            setDetailStartEditing(false);
            return;
        }
        setDetailId(null);
        setDetailStartEditing(false);
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

    const handleCreate = () => {
        setModalInitialContent('');
        setShowAddModal(true);
    };

    const handleView = (id: number) => {
        if (!isManagementView) {
            incrementViewCount.mutate(id, {
                onSuccess: () => {
                    refetch();
                },
            });
        }
        setDetailStartEditing(false);
        setDetailId(id);
        syncDetailHash(id);
    };

    const handleEdit = (id: number) => {
        setDetailStartEditing(true);
        setDetailId(id);
        syncDetailHash(id);
    };

    const handleDelete = (id: number) => {
        setDeleteTarget(id);
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
        const trimmedContent = content.trim();
        if (!trimmedContent) return;

        try {
            const htmlContent = trimmedContent
                .split('\n')
                .map((line) => `<p>${line}</p>`)
                .join('');

            await createKnowledge.mutateAsync({
                content: htmlContent,
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
        <div className="space-y-3">
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
                {canCreateKnowledge && (
                    <button
                        onClick={handleCreate}
                        className="shrink-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}
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
                            className="inline-flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all bg-white"
                            style={{ fontSize: 13 }}
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
                    <span className="font-semibold text-text-muted" style={{ fontSize: 13 }}>
                        找到 <span className="text-foreground font-bold">{data?.count || 0}</span> 篇相关知识
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
                                columnGap: 14,
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
                            {(data?.results ?? []).map((item, index) => (
                                <KnowledgeCardMymind
                                    key={item.id}
                                    item={item}
                                    onClick={handleView}
                                    onEdit={canUpdateKnowledge ? handleEdit : undefined}
                                    onDelete={canDeleteKnowledge ? handleDelete : undefined}
                                    showActions={canUpdateKnowledge || canDeleteKnowledge}
                                    index={index}
                                />
                            ))}
                        </div>

                        {hasKnowledgeResults && Math.ceil((data?.count ?? 0) / pageSize) > 1 && (
                            <div className="flex justify-center pt-8">
                                <Pagination
                                    current={page}
                                    total={data?.count ?? 0}
                                    pageSize={pageSize}
                                    onChange={handlePageChange}
                                />
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
                    taskId={taskId || undefined}
                    taskKnowledgeId={taskKnowledgeId || undefined}
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
        </div>
    );
};
