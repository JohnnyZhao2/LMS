import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import {
    Search,
    Home,
    Database,
    Inbox,
    Plus,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/types/api';

import { useKnowledgeList } from '../api/knowledge';
import { useDeleteKnowledge } from '../api/manage-knowledge';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import { getLineTypeIcon } from '../utils';

interface KnowledgeCenterProps {
    isAdmin?: boolean;
}


export const KnowledgeCenter: React.FC<KnowledgeCenterProps> = ({ isAdmin = false }) => {
    const { roleNavigate } = useRoleNavigate();
    const incrementViewCount = useIncrementViewCount();
    const { hasPermission } = useAuth();
    const canCreateKnowledge = hasPermission('knowledge.create');
    const canUpdateKnowledge = hasPermission('knowledge.update');
    const canDeleteKnowledge = hasPermission('knowledge.delete');
    const isManagementView = isAdmin || canCreateKnowledge || canUpdateKnowledge || canDeleteKnowledge;

    const deleteKnowledge = useDeleteKnowledge();
    const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);

    const {
        search,
        searchValue,
        setSearchValue,
        submitSearch,
        selectedLineTypeId,
        handleLineTypeSelect,
        selectedSystemTagIds,
        toggleSystemTag,
        page,
        pageSize,
        handlePageChange,
    } = useKnowledgeFilters({ defaultPageSize: 9 });

    const { data: lineTypeTags = [] } = useLineTypeTags();
    const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);

    const { data, isLoading, refetch } = useKnowledgeList({
        search: search || undefined,
        line_tag_id: selectedLineTypeId,
        system_tag_id: selectedSystemTagIds[0],
        page,
        pageSize,
    });

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            submitSearch();
        }
    };

    const handleCreate = () => {
        roleNavigate(`${ROUTES.KNOWLEDGE}/create`);
    };

    const handleView = (id: number) => {
        if (!isManagementView) {
            incrementViewCount.mutate(id, {
                onSuccess: () => {
                    refetch();
                },
            });
            roleNavigate(`${ROUTES.KNOWLEDGE}/${id}`);
        } else {
            roleNavigate(`${ROUTES.KNOWLEDGE}/${id}`);
        }
    };

    const handleEdit = (id: number) => {
        roleNavigate(`${ROUTES.KNOWLEDGE}/${id}/edit`);
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

    return (
        <div className="space-y-8">
            <PageHeader
                title={isManagementView ? "知识库管理" : "知识中心"}
                icon={<Database />}
                extra={
                    <div className="flex items-center gap-4">
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="搜索知识内容..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="pl-9 h-10 bg-muted border-0 rounded-md focus:bg-background focus:border-2 focus:border-primary text-sm"
                            />
                        </div>
                        {canCreateKnowledge ? (
                            <Button
                                onClick={handleCreate}
                                className="h-10 px-4 rounded-md bg-primary text-white font-semibold hover:bg-primary-600 transition duration-200 hover:scale-105 shadow-sm"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                新建知识
                            </Button>
                        ) : (
                            <Button
                                onClick={submitSearch}
                                className="h-10 px-6 rounded-md bg-primary text-white font-bold hover:bg-primary-600 transition duration-200 hover:scale-105 shadow-sm"
                            >
                                搜索
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
                {/* 左侧筛选侧边栏 */}
                <div className="bg-background rounded-lg p-6 space-y-8 sticky top-24 border-0">
                    <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-6 px-2">知识条线</h4>
                        <nav className="space-y-2">
                            <button
                                onClick={() => handleLineTypeSelect(undefined)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition duration-200",
                                    !selectedLineTypeId
                                        ? "bg-primary text-white"
                                        : "text-foreground hover:bg-muted"
                                )}
                            >
                                <Home className="w-4 h-4" />
                                <span>全部条线</span>
                            </button>
                            {lineTypeTags.map((tag: TagType) => (
                                <button
                                    key={tag.id}
                                    onClick={() => handleLineTypeSelect(tag.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition duration-200",
                                        selectedLineTypeId === tag.id
                                            ? "bg-primary text-white"
                                            : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    {getLineTypeIcon(tag.name)}
                                    <span>{tag.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {selectedLineTypeId && systemTags.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4 px-2">系统标签</h4>
                            <div className="flex flex-wrap gap-2 px-1">
                                <button
                                    onClick={() => toggleSystemTag(-1)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition duration-200",
                                        selectedSystemTagIds.length === 0
                                            ? "bg-primary text-white"
                                            : "bg-muted text-text-muted hover:bg-muted"
                                    )}
                                >
                                    全部系统
                                </button>
                                {systemTags.map((tag: TagType) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleSystemTag(tag.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-semibold transition duration-200",
                                            selectedSystemTagIds.includes(tag.id)
                                                ? "bg-primary text-white"
                                                : "bg-muted text-text-muted hover:bg-muted"
                                        )}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 右侧列表区 */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-semibold text-text-muted">
                            找到 <span className="text-foreground font-bold">{data?.count || 0}</span> 篇相关知识
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : data?.results && data.results.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {data.results.map((item) => (
                                    <div key={item.id} className="group">
                                        <SharedKnowledgeCard
                                            item={item}
                                            variant={isManagementView ? "admin" : "student"}
                                            showActions={canUpdateKnowledge || canDeleteKnowledge}
                                            onView={handleView}
                                            onEdit={canUpdateKnowledge ? handleEdit : undefined}
                                            onDelete={canDeleteKnowledge ? handleDelete : undefined}
                                        />
                                    </div>
                                ))}
                            </div>

                            {Math.ceil(data.count / pageSize) > 1 && (
                                <div className="flex justify-center pt-8">
                                    <Pagination
                                        current={page}
                                        total={data.count}
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
        </div>
    );
};
