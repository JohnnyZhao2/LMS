import * as React from 'react';
import { SelectionIndicator } from '@/components/common/selection-indicator';
import { useRoleNavigate } from '@/session/hooks/use-role-navigate';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Inbox,
    Search,
    Upload,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/types/common';

import { useInfiniteKnowledgeList, useCreateKnowledge, useDeleteKnowledge, useIncrementViewCount } from '../api/knowledge';
import { useCreateTag, useDeleteTag, useTags } from '@/entities/tag/api/tags';
import { SpaceTagQuickCreateDialog } from '@/entities/tag/components/space-tag-quick-create-dialog';
import { showApiError } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import { KnowledgeCardMymind } from './cards/knowledge-card';
import { AddKnowledgeCard } from './cards/knowledge-add-card';
import { KnowledgeDetailModal } from './modals/knowledge-detail-modal';
import {
    parseKnowledgeImportXlsx,
    collectKnowledgeImportNames,
    resolveKnowledgeImportRows,
} from '../utils/import-knowledge-xlsx';
import { SPACE_THEME_COLORS } from '@/components/common/space-color-ring-picker';

type KnowledgeModalState =
    | {
        kind: 'create';
        initialTitle?: string;
        initialContent?: string;
        initialExternalDocUrl?: string;
        initialSpaceTagId?: number;
      }
    | { kind: 'detail'; knowledgeId: number; startEditing: boolean; startInFocus?: boolean };

export const KnowledgeCenter: React.FC = () => {
    const { roleNavigate } = useRoleNavigate();
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeKnowledgeId } = useParams<{ id?: string }>();
    const incrementViewCount = useIncrementViewCount();
    const { hasCapability } = useAuth();
    const canCreateKnowledge = hasCapability('knowledge.create');
    const canUpdateKnowledge = hasCapability('knowledge.update');
    const canDeleteKnowledge = hasCapability('knowledge.delete');
    const isManagementView = canCreateKnowledge || canUpdateKnowledge || canDeleteKnowledge;

    const deleteKnowledge = useDeleteKnowledge();
    const createKnowledge = useCreateKnowledge();
    const createTag = useCreateTag();
    const deleteTag = useDeleteTag();
    const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);
    const [deleteSpaceTagTarget, setDeleteSpaceTagTarget] = React.useState<number | null>(null);
    const [modalState, setModalState] = React.useState<KnowledgeModalState | null>(null);
    const [hoveredSpaceTagId, setHoveredSpaceTagId] = React.useState<number | null>(null);
    const [isSpaceTagActionHovered, setIsSpaceTagActionHovered] = React.useState(false);
    const [isCreateSpaceTagOpen, setIsCreateSpaceTagOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [searchValue, setSearchValue] = React.useState('');
    const [selectedSpaceTagId, setSelectedSpaceTagId] = React.useState<number | undefined>();
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
    const isEditRoute = location.pathname.endsWith('/edit');

    const [isImporting, setIsImporting] = React.useState(false);
    const importInputRef = React.useRef<HTMLInputElement | null>(null);

    const { data: spaceTags = [] } = useTags({ tag_type: 'SPACE', limit: 200 });
    const { data: knowledgeTags = [] } = useTags({
        tag_type: 'TAG',
        applicable_to: 'knowledge',
        limit: 500,
    });
    const selectedSpaceTag = React.useMemo(
        () => spaceTags.find((tag) => tag.id === selectedSpaceTagId),
        [spaceTags, selectedSpaceTagId],
    );
    const isDeleteSpaceTagMode = canDeleteKnowledge && !!selectedSpaceTag;

    const {
        data,
        isLoading,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteKnowledgeList({
        search: search || undefined,
        space_tag_id: selectedSpaceTagId,
        pageSize,
    });
    const knowledgeItems = React.useMemo(
        () => (data?.pages ?? []).flatMap((pageData) => pageData.results),
        [data?.pages],
    );
    const totalCount = data?.pages?.[0]?.count ?? 0;
    const hasKnowledgeResults = knowledgeItems.length > 0;
    const shouldShowKnowledgeGrid = canCreateKnowledge || hasKnowledgeResults;

    const openDetailModal = React.useCallback((
        knowledgeId: number,
        startEditing = false,
        startInFocus = false,
    ) => {
        setModalState({ kind: 'detail', knowledgeId, startEditing, startInFocus });
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

    const handleFocusView = (id: number) => {
        if (!isManagementView) {
            incrementViewCount.mutate(id, {
                onSuccess: () => {
                    refetch();
                },
            });
        }
        openDetailModal(id, false, true);
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
            openDetailModal(routeKnowledgeIdNumber, isEditRoute);
            return;
        }
        if (hashKnowledgeId && Number.isFinite(hashKnowledgeId)) {
            openDetailModal(hashKnowledgeId);
            return;
        }
        setModalState(null);
    }, [hashKnowledgeId, isCreateRoute, isEditRoute, openDetailModal, routeKnowledgeIdNumber, selectedSpaceTagId]);

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
        openDetailModal(id);
        syncDetailHash(id);
    };

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
            refetch();
        } catch (error) {
            showApiError(error, '创建失败');
            throw error;
        }
    }, [createKnowledge, selectedSpaceTagId, refetch]);

    const handleImportXlsx = React.useCallback(async (file: File) => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            const rows = await parseKnowledgeImportXlsx(file);
            const { spaceNames, tagNames } = collectKnowledgeImportNames(rows);

            const spaces = [...spaceTags];
            const tags = [...knowledgeTags];
            const spaceByName = new Map(spaces.map((item) => [item.name.trim(), item]));
            const tagByName = new Map(tags.map((item) => [item.name.trim(), item]));

            for (const [index, name] of spaceNames.entries()) {
                if (spaceByName.has(name)) continue;
                const created = await createTag.mutateAsync({
                    name,
                    tag_type: 'SPACE',
                    color: SPACE_THEME_COLORS[index % SPACE_THEME_COLORS.length],
                });
                spaces.push(created);
                spaceByName.set(created.name.trim(), created);
            }

            for (const name of tagNames) {
                if (tagByName.has(name)) continue;
                const created = await createTag.mutateAsync({
                    name,
                    tag_type: 'TAG',
                    current_module: 'knowledge',
                    allow_knowledge: true,
                });
                tags.push(created);
                tagByName.set(created.name.trim(), created);
            }

            const { ready, failures } = resolveKnowledgeImportRows(rows, spaces, tags);
            let successCount = 0;
            const createFailures = [...failures];

            for (const item of ready) {
                const { rowNumber, ...payload } = item;
                try {
                    await createKnowledge.mutateAsync(payload);
                    successCount += 1;
                } catch (error) {
                    const message = error instanceof Error ? error.message : '创建失败';
                    createFailures.push({ rowNumber, reason: message });
                }
            }

            await refetch();

            if (successCount > 0 && createFailures.length === 0) {
                toast.success(`已导入 ${successCount} 条知识`);
                return;
            }
            if (successCount > 0) {
                toast.warning(`导入完成：成功 ${successCount}，失败 ${createFailures.length}`);
            } else {
                toast.error(`导入失败：${createFailures[0]?.reason ?? '无有效数据'}`);
            }
            if (createFailures.length > 0 && createFailures.length <= 8) {
                createFailures.forEach((item) => {
                    toast.error(`第 ${item.rowNumber} 行：${item.reason}`);
                });
            } else if (createFailures.length > 8) {
                toast.error(`另有 ${createFailures.length - 1} 行失败`);
            }
        } catch (error) {
            showApiError(error, '导入失败');
        } finally {
            setIsImporting(false);
            if (importInputRef.current) {
                importInputRef.current.value = '';
            }
        }
    }, [createKnowledge, createTag, isImporting, knowledgeTags, refetch, spaceTags]);

    const handleCreateSpaceTag = React.useCallback(async ({ name, color }: { name: string; color: string }) => {
        try {
            await createTag.mutateAsync({
                name,
                tag_type: 'SPACE',
                color,
            });
            toast.success('space 已添加');
            setIsCreateSpaceTagOpen(false);
        } catch (error) {
            showApiError(error, '添加失败');
        }
    }, [createTag]);

    const handleDeleteSpaceTag = React.useCallback(async () => {
        if (!deleteSpaceTagTarget) return;

        try {
            await deleteTag.mutateAsync(deleteSpaceTagTarget);
            setSelectedSpaceTagId(undefined);
            toast.success('space 已删除');
        } catch (error) {
            showApiError(error, '删除失败');
        } finally {
            setDeleteSpaceTagTarget(null);
        }
    }, [deleteSpaceTagTarget, deleteTag]);

    return (
        <PageShell
            className="pb-4"
            style={{ fontFamily: "'DM Sans', 'PingFang SC', 'Noto Sans SC', sans-serif" }}
        >
            <PageHeader
                title="知识中心"
                icon={<Inbox />}
            />

            <div className="relative w-full">
                <Search
                    className="pointer-events-none absolute bottom-[12px] left-0 h-4 w-4 text-foreground/28 sm:bottom-[14px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                />
                <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') setSearch(searchValue);
                    }}
                    placeholder=""
                    aria-label="搜索知识"
                    className="w-full border-0 border-b border-foreground/15 bg-transparent py-3 pl-8 text-xl font-light text-foreground/60 outline-none transition-colors focus:border-foreground/40 sm:pl-12 sm:text-2xl"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
                />
            </div>

            {(spaceTags.length > 0 || isManagementView) && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {spaceTags.map((tag: TagType) => (
                            <button
                                key={tag.id}
                                onClick={() => setSelectedSpaceTagId(
                                    selectedSpaceTagId === tag.id ? undefined : tag.id
                                )}
                                onMouseEnter={() => setHoveredSpaceTagId(tag.id)}
                                onMouseLeave={() => setHoveredSpaceTagId((current) => (current === tag.id ? null : current))}
                                className="inline-flex max-w-full items-center gap-2.5 rounded-[6px] bg-white px-3 py-2 font-medium transition-[box-shadow] duration-200"
                                style={{
                                    fontSize: 12.5,
                                    boxShadow: hoveredSpaceTagId === tag.id
                                        ? '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
                                        : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
                                }}
                            >
                                <SelectionIndicator
                                    color={tag.color || 'var(--theme-primary)'}
                                    selected={selectedSpaceTagId === tag.id}
                                    className="transition-all"
                                />
                                <span className="max-w-[12rem] truncate text-gray-900 sm:max-w-[14rem]">
                                    {tag.name}
                                </span>
                            </button>
                        ))}

                        {spaceTags.length === 0 && isManagementView && (
                            <span className="px-4 py-2 text-sm text-text-muted">
                                暂无space
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {canCreateKnowledge && (
                            <>
                                <input
                                    ref={importInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) void handleImportXlsx(file);
                                    }}
                                />
                                <button
                                    type="button"
                                    disabled={isImporting}
                                    onClick={() => importInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 font-medium text-foreground disabled:opacity-50"
                                    style={{
                                        fontSize: 12.5,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
                                    }}
                                >
                                    <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
                                    {isImporting ? '导入中…' : '导入表格'}
                                </button>
                            </>
                        )}
                        {isManagementView && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (isDeleteSpaceTagMode && selectedSpaceTag) {
                                        setDeleteSpaceTagTarget(selectedSpaceTag.id);
                                        return;
                                    }
                                    setIsCreateSpaceTagOpen(true);
                                }}
                                onMouseEnter={() => setIsSpaceTagActionHovered(true)}
                                onMouseLeave={() => setIsSpaceTagActionHovered(false)}
                                className={cn(
                                    'inline-flex w-full items-center justify-center rounded-full px-4 py-2 font-medium transition-[background-color,box-shadow,color] duration-200 sm:w-auto',
                                    isDeleteSpaceTagMode
                                        ? 'bg-destructive text-white'
                                        : 'gap-3 bg-white text-foreground',
                                )}
                                style={{
                                    fontSize: 12.5,
                                    boxShadow: isSpaceTagActionHovered
                                        ? (
                                            isDeleteSpaceTagMode
                                                ? '0 14px 28px rgba(220,38,38,0.26)'
                                                : '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
                                        )
                                        : (
                                            isDeleteSpaceTagMode
                                                ? '0 10px 24px rgba(220,38,38,0.18)'
                                                : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)'
                                        ),
                                }}
                            >
                                {!isDeleteSpaceTagMode && (
                                    <span className="h-4 w-4 rounded-full border-2 border-accent" />
                                )}
                                {isDeleteSpaceTagMode ? '删除此类型' : '添加空间'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
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
                            className="sm:[column-width:280px] [column-width:100%]"
                        >
                            {canCreateKnowledge && (
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
                open={deleteSpaceTagTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteSpaceTagTarget(null); }}
                title="确认删除此类型吗？"
                description={selectedSpaceTag
                    ? `删除“${selectedSpaceTag.name}”不会删除知识卡片，只会删除此类型。`
                    : '删除此类型不会删除知识卡片，只会删除此类型。'}
                confirmText="删除此类型"
                confirmVariant="destructive"
                isConfirming={deleteTag.isPending}
                onConfirm={handleDeleteSpaceTag}
            />

            {detailModalState && (
                <KnowledgeDetailModal
                    key={`${detailModalState.knowledgeId}-${detailModalState.startEditing ? 'edit' : 'view'}-${detailModalState.startInFocus ? 'focus' : 'modal'}`}
                    knowledgeId={detailModalState.knowledgeId}
                    startEditing={detailModalState.startEditing}
                    startInFocus={detailModalState.startInFocus}
                    taskId={taskId || undefined}
                    taskKnowledgeId={taskKnowledgeId || undefined}
                    onClose={dismissDetailModal}
                    onDelete={(id) => {
                        setDeleteTarget(id);
                        dismissDetailModal();
                    }}
                    onUpdated={() => refetch()}
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
                            roleNavigate('knowledge');
                        }
                    }}
                    onCreated={(id) => {
                        refetch();
                        if (isCreateRoute) {
                            roleNavigate(`knowledge#${id}`);
                            return;
                        }
                        openDetailModal(id);
                        syncDetailHash(id);
                    }}
                />
            )}

            <SpaceTagQuickCreateDialog
                open={isCreateSpaceTagOpen}
                onOpenChange={setIsCreateSpaceTagOpen}
                onSubmit={handleCreateSpaceTag}
                isSubmitting={createTag.isPending}
            />
        </PageShell>
    );
};
