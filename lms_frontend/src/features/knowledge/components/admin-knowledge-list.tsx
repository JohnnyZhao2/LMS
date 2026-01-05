import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  Search,
  Home,
  Database,
  Inbox,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags } from '../api/get-tags';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { getLineTypeIcon } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import type { Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

/**
 * 管理员知识库列表组件 - 极致美学一致性版
 */
export const AdminKnowledgeList: React.FC = () => {
  const navigate = useNavigate();

  // 使用共用的筛选 Hook
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

  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();

  const { data, isLoading } = useAdminKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    page,
    pageSize,
  });

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

