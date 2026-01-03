import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  Search,
  Home,
  Database,
  Inbox,
  LayoutGrid,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags } from '../api/get-tags';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { getLineTypeIcon } from '../utils';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import type { KnowledgeFilterType, Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

/**
 * 管理员知识库列表组件 - 极致美学一致性版
 */
export const AdminKnowledgeList: React.FC = () => {
  const navigate = useNavigate();
  const [unpublishDialog, setUnpublishDialog] = useState<{ open: boolean; id?: number }>({ open: false });

  // 使用共用的筛选 Hook
  const {
    search,
    searchValue,
    setSearchValue,
    submitSearch,
    selectedLineTypeId,
    handleLineTypeSelect,
    filterType,
    setFilterType,
    page,
    pageSize,
    handlePageChange,
  } = useKnowledgeFilters({ defaultPageSize: 9 });

  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();

  const { data, isLoading, refetch } = useAdminKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    filter_type: filterType,
    page,
    pageSize,
  });

  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitSearch();
    }
  };

  const handleCreate = () => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/create`);
  };

  const handleView = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}`);
  };

  const handleEdit = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}/edit`);
  };

  const handlePublish = async (id: number) => {
    try {
      await publishKnowledge.mutateAsync(id);
      toast.success('发布成功');
      refetch();
    } catch (error) {
      showApiError(error, '发布失败');
    }
  };

  const handleUnpublish = async (id: number) => {
    setUnpublishDialog({ open: true, id });
  };

  const confirmUnpublish = async () => {
    if (!unpublishDialog.id) return;
    try {
      await unpublishKnowledge.mutateAsync(unpublishDialog.id);
      toast.success('取消发布成功');
      refetch();
      setUnpublishDialog({ open: false });
    } catch (error) {
      showApiError(error, '取消发布失败');
    }
  };

  const statusFilters: Array<{ key: KnowledgeFilterType; label: string; dotClass?: string; showIcon?: boolean }> = [
    { key: 'ALL', label: '全部文档', showIcon: true },
    { key: 'PUBLISHED_CLEAN', label: '已发布', dotClass: 'bg-[#10B981]' },
    { key: 'REVISING', label: '修订中', dotClass: 'bg-[#F59E0B]' },
    { key: 'UNPUBLISHED', label: '草稿', dotClass: 'bg-[#9CA3AF]' },
  ];

  return (
    <div className="space-y-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <PageHeader
        title="知识库管理"
        subtitle="Repository & Content Management"
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
            <Button
              onClick={handleCreate}
              className="h-14 px-6 rounded-md bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] transition-all duration-200 hover:scale-105 shadow-none"
            >
              <Plus className="mr-2 h-5 w-5" />
              新建知识
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* 左侧侧边栏 */}
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

          <div>
            <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-4 px-2">状态筛选</h4>
            <div className="space-y-1 px-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 shadow-none",
                    filterType === filter.key
                      ? "bg-[#111827] text-white"
                      : "text-[#111827] hover:bg-[#F3F4F6]"
                  )}
                >
                  {filter.showIcon ? <LayoutGrid className="w-3.5 h-3.5" /> : <div className={cn("w-2 h-2 rounded-full", filter.dotClass)} />}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>
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
                      variant="admin"
                      showActions
                      onView={handleView}
                      onEdit={handleEdit}
                      onPublish={handlePublish}
                      onUnpublish={handleUnpublish}
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

      {/* 取消发布确认对话框 */}
      <ConfirmDialog
        open={unpublishDialog.open}
        onOpenChange={(open) => setUnpublishDialog({ open })}
        title="确认下线此知识？"
        description="取消发布后，该知识将变为草稿状态，学员将无法查看，也无法用于任务分配。确定要取消发布吗？"
        icon={<Shield className="h-10 w-10" />}
        iconBgColor="bg-[#F59E0B]"
        iconColor="text-white"
        confirmText="下线文档"
        cancelText="取消"
        confirmVariant="default"
        onConfirm={confirmUnpublish}
        isConfirming={unpublishKnowledge.isPending}
      />
    </div>
  );
};

