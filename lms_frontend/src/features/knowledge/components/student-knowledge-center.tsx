import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import {
  Search,
  Home,
  Database,
  Cloud,
  Network,
  Shield,
  Settings,
  FileText,
  Inbox,
  LayoutGrid,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentKnowledgeList } from '../api/get-student-knowledge-list';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { useIncrementViewCount } from '../api/increment-view-count';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import type { Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * 条线类型图标映射
 */
const LINE_TYPE_ICONS: Record<string, React.ReactNode> = {
  '双云': <Cloud className="w-4.5 h-4.5" />,
  '数据库': <Database className="w-4.5 h-4.5" />,
  '网络': <Network className="w-4.5 h-4.5" />,
  '应用': <LayoutGrid className="w-4.5 h-4.5" />,
  '应急': <Shield className="w-4.5 h-4.5" />,
  '规章制度': <FileText className="w-4.5 h-4.5" />,
  '其他': <Settings className="w-4.5 h-4.5" />,
};

/**
 * 获取条线类型图标
 */
const getLineTypeIcon = (name: string): React.ReactNode => {
  return LINE_TYPE_ICONS[name] || <FileText className="w-4.5 h-4.5" />;
};

/**
 * 学员知识中心组件 - 极致美学一致性版
 */
export const StudentKnowledgeCenter: React.FC = () => {
  const navigate = useNavigate();
  const incrementViewCount = useIncrementViewCount();

  // 使用共用的筛选 Hook
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
  } = useKnowledgeFilters({ defaultPageSize: 12 });

  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);

  // 获取知识列表
  const { data, isLoading, refetch } = useStudentKnowledgeList({
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

  const handleView = (id: number) => {
    incrementViewCount.mutate(id, {
      onSuccess: () => {
        refetch();
      },
    });
    navigate(`${ROUTES.KNOWLEDGE}/${id}`);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="知识中心"
        subtitle="Knowledge & Resources"
        icon={<Database />}
        extra={
          <div className="flex items-center gap-4">
            <div className="relative group min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              <Input
                placeholder="搜索知识文档..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-11 h-12 bg-white/50 border-none rounded-xl focus:ring-4 ring-primary-50 shadow-inner text-sm"
              />
            </div>
            <Button
              onClick={submitSearch}
              className="h-12 px-6 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-all duration-300 transform hover:scale-105"
            >
              搜索
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* 左侧筛选侧边栏 */}
        <div className="glass-card rounded-[2rem] p-6 space-y-8 sticky top-24">
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">条线分类</h4>
            <nav className="space-y-2">
              <button
                onClick={() => handleLineTypeSelect(undefined)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  !selectedLineTypeId
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    selectedLineTypeId === tag.id
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {getLineTypeIcon(tag.name)}
                  <span>{tag.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {selectedLineTypeId && systemTags.length > 0 && (
            <div className="reveal-item">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">系统详情</h4>
              <div className="flex flex-wrap gap-2 px-1">
                <button
                  onClick={() => toggleSystemTag(-1)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    selectedSystemTagIds.length === 0
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  全部系统
                </button>
                {systemTags.map((tag: TagType) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleSystemTag(tag.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      selectedSystemTagIds.includes(tag.id)
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
            <span className="text-sm font-bold text-gray-400">
              找到 <span className="text-gray-900">{data?.count || 0}</span> 篇相关知识
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.results.map((item, index) => (
                <div key={item.id} className={cn("reveal-item", `stagger-delay-${(index % 4) + 1}`)}>
                  <SharedKnowledgeCard
                    item={item}
                    variant="student"
                    onView={handleView}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-white/30 rounded-[2rem] border-2 border-dashed border-gray-100">
              <Inbox className="w-16 h-16 text-gray-200 mb-4" />
              <span className="text-lg font-bold text-gray-400">暂无知识文档</span>
            </div>
          )}

          {data?.count && data.count > pageSize && (
            <div className="flex justify-center pt-8">
              <Pagination
                current={page}
                total={data.count}
                pageSize={pageSize}
                onChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

