"use client"

import * as React from 'react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { useParams } from 'react-router-dom';
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
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { Tag as TagType } from '@/types/api';

import { useKnowledgeList } from '../api/knowledge';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import { getLineTypeIcon } from '../utils';

interface KnowledgeCenterProps {
    isAdmin?: boolean;
}


export const KnowledgeCenter: React.FC<KnowledgeCenterProps> = ({ isAdmin = false }) => {
    const { role } = useParams<{ role: string }>();
    const { roleNavigate } = useRoleNavigate();
    const incrementViewCount = useIncrementViewCount();
    const { currentRole } = useAuth();

    // 优先使用 URL 中的角色参数
    const effectiveRole = role?.toUpperCase() || currentRole;
    const isAdminView = isAdmin || effectiveRole === 'ADMIN';

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
        line_type_id: selectedLineTypeId,
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
        if (!isAdminView) {
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

    return (
        <div className="space-y-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <PageHeader
                title={isAdminView ? "知识库管理" : "知识中心"}
                subtitle={isAdminView ? "Repository & Content Management" : "Knowledge & Resources"}
                icon={<Database />}
                extra={
                    <div className="flex items-center gap-4">
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#3B82F6] transition-colors" />
                            <Input
                                placeholder="搜索知识文档..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="pl-11 h-14 bg-[#F3F4F6] border-0 rounded-md focus:bg-white focus:border-2 focus:border-[#3B82F6] text-sm shadow-none"
                            />
                        </div>
                        {isAdminView ? (
                            <Button
                                onClick={handleCreate}
                                className="h-14 px-6 rounded-md bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] transition-all duration-200 hover:scale-105 shadow-none"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                新建知识
                            </Button>
                        ) : (
                            <Button
                                onClick={submitSearch}
                                className="h-14 px-6 rounded-md bg-[#3B82F6] text-white font-bold hover:bg-[#2563EB] transition-all duration-200 hover:scale-105 shadow-none"
                            >
                                搜索
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
                {/* 左侧筛选侧边栏 */}
                <div className="bg-white rounded-lg p-6 space-y-8 sticky top-24 border-0 shadow-none">
                    <div>
                        <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-6 px-2">条线分类</h4>
                        <nav className="space-y-2">
                            <button
                                onClick={() => handleLineTypeSelect(undefined)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 shadow-none",
                                    !selectedLineTypeId
                                        ? "bg-[#3B82F6] text-white"
                                        : "text-[#111827] hover:bg-[#F3F4F6]"
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
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 shadow-none",
                                        selectedLineTypeId === tag.id
                                            ? "bg-[#3B82F6] text-white"
                                            : "text-[#111827] hover:bg-[#F3F4F6]"
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
                            <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-4 px-2">系统详情</h4>
                            <div className="flex flex-wrap gap-2 px-1">
                                <button
                                    onClick={() => toggleSystemTag(-1)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 shadow-none",
                                        selectedSystemTagIds.length === 0
                                            ? "bg-[#3B82F6] text-white"
                                            : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                                    )}
                                >
                                    全部系统
                                </button>
                                {systemTags.map((tag: TagType) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleSystemTag(tag.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 shadow-none",
                                            selectedSystemTagIds.includes(tag.id)
                                                ? "bg-[#3B82F6] text-white"
                                                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
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
                        <span className="text-sm font-semibold text-[#6B7280]">
                            找到 <span className="text-[#111827] font-bold">{data?.count || 0}</span> 篇相关知识
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
                                            variant={isAdminView ? "admin" : "student"}
                                            showActions={isAdminView}
                                            onView={handleView}
                                            onEdit={isAdminView ? handleEdit : undefined}
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
                            description="暂无知识文档"
                            className="py-32 bg-[#F3F4F6] rounded-lg"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
