import * as React from 'react';
import { SelectionIndicator } from '@/components/common/selection-indicator';
import { useRoleNavigate } from '@/session/hooks/use-role-navigate';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Inbox,
    Search,
    Trash2,
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

import {
    useInfiniteKnowledgeList,
    useCreateKnowledge,
    useBulkImportKnowledge,
    useBulkDeleteKnowledge,
    useDeleteKnowledge,
    useIncrementViewCount,
    type KnowledgeBulkDeleteItem,
} from '../api/knowledge';
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
    KNOWLEDGE_IMPORT_HEADERS,
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

type BulkRowFailure = { row: number; reason: string };

const XLSX_ACCEPT = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
const XLSX_BTN_STYLE = {
  fontSize: 12.5,
  boxShadow: '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
} as const;

/** 批量导入/删除结果 toast */
function toastBulkOutcome(
  successCount: number,
  failures: BulkRowFailure[],
  messages: { ok: string; partial: string; fail: string },
) {
  if (successCount > 0 && failures.length === 0) {
    toast.success(messages.ok);
    return;
  }
  if (successCount > 0) toast.warning(messages.partial);
  else toast.error(messages.fail);
  if (failures.length > 0 && failures.length <= 8) {
    failures.forEach((item) => toast.error(`第 ${item.row} 行：${item.reason}`));
  } else if (failures.length > 8) {
    toast.error(`另有 ${failures.length - 1} 行失败`);
  }
}

/** 表格导入/删除按钮（进度文案显示在按钮上） */
function KnowledgeXlsxButton({
  inputRef,
  progress,
  idleLabel,
  title,
  disabled,
  icon,
  onFile,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  progress: string | null;
  idleLabel: string;
  title: string;
  disabled: boolean;
  icon: React.ReactNode;
  onFile: (file: File) => void;
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={XLSX_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 font-medium text-foreground disabled:opacity-50"
        style={XLSX_BTN_STYLE}
      >
        {progress ? <Spinner size="sm" /> : icon}
        {progress ?? idleLabel}
      </button>
    </>
  );
}

export const KnowledgeCenter: React.FC = () => {
    const { roleNavigate } = useRoleNavigate();
    const navigate = useNavigate();
    const location = useLocation();
    const { id: routeKnowledgeId } = useParams<{ id?: string }>();
    const incrementViewCount = useIncrementViewCount();
    const { hasCapability } = useAuth();
    const canCreateKnowledge = hasCapability('knowledge.add_knowledge');
    const canUpdateKnowledge = hasCapability('knowledge.change_knowledge');
    const canDeleteKnowledge = hasCapability('knowledge.delete_knowledge');
    const isManagementView = canCreateKnowledge || canUpdateKnowledge || canDeleteKnowledge;

    const deleteKnowledge = useDeleteKnowledge();
    const createKnowledge = useCreateKnowledge();
    const bulkImportKnowledge = useBulkImportKnowledge();
    const bulkDeleteKnowledge = useBulkDeleteKnowledge();
    const createTag = useCreateTag();
    const deleteTag = useDeleteTag();
    const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);
    const [deleteSpaceTagTarget, setDeleteSpaceTagTarget] = React.useState<number | null>(null);
    const [bulkDeleteItems, setBulkDeleteItems] = React.useState<KnowledgeBulkDeleteItem[] | null>(null);
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

    /** 非 null 表示进行中，文案直接显示在对应按钮上 */
    const [importProgress, setImportProgress] = React.useState<string | null>(null);
    const [deleteProgress, setDeleteProgress] = React.useState<string | null>(null);
    const isImporting = importProgress !== null;
    const isBulkDeleting = deleteProgress !== null;
    const importInputRef = React.useRef<HTMLInputElement | null>(null);
    const bulkDeleteInputRef = React.useRef<HTMLInputElement | null>(null);

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
        if (importProgress) return;
        setImportProgress('解析中…');
        try {
            const rows = await parseKnowledgeImportXlsx(file);
            const { spaceNames, tagNames } = collectKnowledgeImportNames(rows);

            const spaces = [...spaceTags];
            const tags = [...knowledgeTags];
            const spaceByName = new Map(spaces.map((item) => [item.name.trim(), item]));
            const tagByName = new Map(tags.map((item) => [item.name.trim(), item]));
            const tagTotal = spaceNames.filter((n) => !spaceByName.has(n)).length
                + tagNames.filter((n) => !tagByName.has(n)).length;
            let tagDone = 0;

            for (const [index, name] of spaceNames.entries()) {
                if (spaceByName.has(name)) continue;
                setImportProgress(`标签 ${++tagDone}/${tagTotal}`);
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
                setImportProgress(`标签 ${++tagDone}/${tagTotal}`);
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
            if (ready.length === 0) {
                toast.error(failures[0] ? `第 ${failures[0].rowNumber} 行：${failures[0].reason}` : '无有效数据');
                return;
            }

            setImportProgress(`同步 ${ready.length} 条…`);
            const result = await bulkImportKnowledge.mutateAsync(
                ready.map(({ rowNumber, ...payload }) => ({
                    ...payload,
                    row_number: rowNumber,
                })),
            );
            setImportProgress('刷新中…');
            await refetch();

            const allFailures: BulkRowFailure[] = [
                ...failures.map((item) => ({ row: item.rowNumber, reason: item.reason })),
                ...result.failures.map((item) => ({ row: item.row_number, reason: item.reason })),
            ];
            const successCount = result.created + result.updated + result.unchanged;
            toastBulkOutcome(successCount, allFailures, {
                ok: `已同步 ${successCount} 条（新建 ${result.created}，更新 ${result.updated}，未变更 ${result.unchanged}）`,
                partial: `导入完成：新建 ${result.created}，更新 ${result.updated}，未变更 ${result.unchanged}，失败 ${allFailures.length}`,
                fail: `导入失败：${allFailures[0]?.reason ?? '无有效数据'}`,
            });
        } catch (error) {
            showApiError(error, '导入失败');
        } finally {
            setImportProgress(null);
            if (importInputRef.current) {
                importInputRef.current.value = '';
            }
        }
    }, [bulkImportKnowledge, createTag, importProgress, knowledgeTags, refetch, spaceTags]);

    const handleBulkDeleteXlsx = React.useCallback(async (file: File) => {
        if (deleteProgress) return;
        setDeleteProgress('解析中…');
        try {
            const rows = await parseKnowledgeImportXlsx(file);
            const items = rows
                .filter((row) => row.externalDocUrl)
                .map((row) => ({
                    row_number: row.rowNumber,
                    external_doc_url: row.externalDocUrl,
                    title: row.title,
                }));
            if (items.length === 0) {
                toast.error('表格中没有文档链接');
                return;
            }
            setBulkDeleteItems(items);
        } catch (error) {
            showApiError(error, '解析表格失败');
        } finally {
            setDeleteProgress(null);
            if (bulkDeleteInputRef.current) {
                bulkDeleteInputRef.current.value = '';
            }
        }
    }, [deleteProgress]);

    const confirmBulkDelete = React.useCallback(async () => {
        if (!bulkDeleteItems || deleteProgress) return;
        setDeleteProgress(`删除 ${bulkDeleteItems.length} 条…`);
        try {
            const result = await bulkDeleteKnowledge.mutateAsync(bulkDeleteItems);
            setDeleteProgress('刷新中…');
            await refetch();
            setBulkDeleteItems(null);

            toastBulkOutcome(
                result.deleted,
                result.failures.map((item) => ({ row: item.row_number, reason: item.reason })),
                {
                    ok: `已删除 ${result.deleted} 条知识`,
                    partial: `删除完成：成功 ${result.deleted}，失败 ${result.failures.length}`,
                    fail: `删除失败：${result.failures[0]?.reason ?? '无匹配数据'}`,
                },
            );
        } catch (error) {
            showApiError(error, '批量删除失败');
        } finally {
            setDeleteProgress(null);
        }
    }, [bulkDeleteItems, bulkDeleteKnowledge, deleteProgress, refetch]);

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
                            <KnowledgeXlsxButton
                                inputRef={importInputRef}
                                progress={importProgress}
                                idleLabel="导入表格"
                                title={`表头：${KNOWLEDGE_IMPORT_HEADERS.join('、')}`}
                                disabled={isImporting || isBulkDeleting}
                                icon={<Upload className="h-3.5 w-3.5" strokeWidth={1.8} />}
                                onFile={(file) => { void handleImportXlsx(file); }}
                            />
                        )}
                        {canDeleteKnowledge && (
                            <KnowledgeXlsxButton
                                inputRef={bulkDeleteInputRef}
                                progress={deleteProgress}
                                idleLabel="表格删除"
                                title="按表格「文档链接」中的 id 批量删除"
                                disabled={isImporting || isBulkDeleting}
                                icon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
                                onFile={(file) => { void handleBulkDeleteXlsx(file); }}
                            />
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
                open={bulkDeleteItems !== null}
                onOpenChange={(open) => { if (!open && !isBulkDeleting) setBulkDeleteItems(null); }}
                title="确认批量删除"
                description={`将按文档链接删除 ${bulkDeleteItems?.length ?? 0} 条知识，此操作不可恢复。`}
                confirmText="删除"
                confirmVariant="destructive"
                isConfirming={isBulkDeleting}
                onConfirm={confirmBulkDelete}
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
