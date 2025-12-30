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
 * 学员知识中心组件
 * 与管理端使用相同的布局风格，但不显示管理功能
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
  } = useKnowledgeFilters();

  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);

  // 获取知识列表（学员端只能看到已发布的）
  const { data, isLoading, refetch } = useStudentKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    page,
    pageSize,
  });

  /**
   * 处理搜索输入回车
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitSearch();
    }
  };

  /**
   * 查看详情
   * 点击知识卡片时，先记录阅读次数，再跳转到详情页
   */
  const handleView = (id: number) => {
    // 记录阅读次数（点击一次计数一次）
    incrementViewCount.mutate(id, {
      onSuccess: () => {
        refetch();
      },
    });
    // 跳转到详情页
    navigate(`${ROUTES.KNOWLEDGE}/${id}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] -m-6 ml-[calc(-50vw+50%-24px)] mr-[calc(-50vw+50%-24px)] w-screen bg-transparent">
      {/* 左侧图标导航栏 */}
      <aside className="fixed left-0 top-[var(--header-height)] w-[100px] h-[calc(100vh-var(--header-height))] flex flex-col items-center py-6 px-5 gap-3 z-[100] bg-transparent">
        {/* 全部 */}
        <div
          className={cn(
            "w-11 h-11 shrink-0 rounded-lg flex items-center justify-center cursor-pointer transition-all relative text-lg",
            "bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
            "hover:bg-white hover:text-primary-500 hover:shadow-[0_3px_10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5",
            !selectedLineTypeId && "bg-primary-500 text-white shadow-[0_3px_12px_rgba(77,108,255,0.35)] hover:bg-primary-600 hover:text-white"
          )}
          onClick={() => handleLineTypeSelect(undefined)}
        >
          <Home className="w-4.5 h-4.5" />
          <span className="absolute left-[60px] top-1/2 -translate-y-1/2 bg-gray-800 text-white py-2 px-3 rounded-md text-[13px] font-medium whitespace-nowrap opacity-0 invisible transition-all z-[100] shadow-lg group-hover:opacity-100 group-hover:visible before:content-[''] before:absolute before:-left-1.5 before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-gray-800 peer-hover:opacity-100 peer-hover:visible [.group:hover_&]:opacity-100 [.group:hover_&]:visible">
            全部条线
          </span>
        </div>

        {/* 条线类型图标 */}
        {lineTypeTags.map((tag: TagType) => (
          <div
            key={tag.id}
            className={cn(
              "group w-11 h-11 shrink-0 rounded-lg flex items-center justify-center cursor-pointer transition-all relative text-lg",
              "bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
              "hover:bg-white hover:text-primary-500 hover:shadow-[0_3px_10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5",
              selectedLineTypeId === tag.id && "bg-primary-500 text-white shadow-[0_3px_12px_rgba(77,108,255,0.35)] hover:bg-primary-600 hover:text-white"
            )}
            onClick={() => handleLineTypeSelect(tag.id)}
          >
            {getLineTypeIcon(tag.name)}
            <span className="absolute left-[60px] top-1/2 -translate-y-1/2 bg-gray-800 text-white py-2 px-3 rounded-md text-[13px] font-medium whitespace-nowrap opacity-0 invisible transition-all z-[100] shadow-lg group-hover:opacity-100 group-hover:visible before:content-[''] before:absolute before:-left-1.5 before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-gray-800">
              {tag.name}
            </span>
          </div>
        ))}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent ml-[100px]">
        {/* 顶部标题栏 - 三栏布局 */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center py-5 px-6 gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            <span className="text-lg font-semibold text-gray-900">知识中心</span>
          </div>
          <div className="flex justify-center">
            <div className="w-[400px] max-w-full relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-[20px] text-gray-900 text-sm transition-all shadow-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:shadow-[0_0_0_3px_rgba(77,108,255,0.12)]"
                placeholder="搜索知识..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onBlur={submitSearch}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {/* 学员端不显示创建按钮 */}
          </div>
        </header>

        {/* 筛选区域 */}
        <div className="py-2 px-6 pb-1">
          {/* 系统标签筛选 */}
          <div className="flex items-center gap-1 mb-3 pb-3">
            <span
              className={cn(
                "py-1.5 px-3.5 bg-transparent border-none rounded-md text-gray-500 text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap",
                "hover:text-gray-700",
                selectedSystemTagIds.length === 0 && "bg-white text-gray-800 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              )}
              onClick={() => toggleSystemTag(-1)}
            >
              ALL_SYSTEMS
            </span>
            {systemTags.map((tag: TagType) => (
              <span
                key={tag.id}
                className={cn(
                  "py-1.5 px-3.5 bg-transparent border-none rounded-md text-gray-500 text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap",
                  "hover:text-gray-700",
                  selectedSystemTagIds.includes(tag.id) && "bg-white text-gray-800 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                )}
                onClick={() => toggleSystemTag(tag.id)}
              >
                {tag.name}
              </span>
            ))}
          </div>

          {/* 学员端不显示状态筛选，只显示统计 */}
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-[13px] font-medium whitespace-nowrap">
              共 {data?.count || 0} 篇知识文档
            </span>
          </div>
        </div>

        {/* 卡片网格区域 */}
        <div className="flex-1 p-4 px-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-4 max-[1400px]:grid-cols-3 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
                {data.results.map((item) => (
                  <SharedKnowledgeCard
                    key={item.id}
                    item={item}
                    variant="student"
                    onView={handleView}
                  />
                ))}
              </div>

              {/* 分页 */}
              <div className="flex justify-center py-6">
                <Pagination
                  current={page}
                  total={data.count || 0}
                  pageSize={pageSize}
                  onChange={handlePageChange}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-500">
              <Inbox className="w-12 h-12 text-gray-300 mb-4" />
              <span className="text-base font-medium text-gray-500">暂无知识文档</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
