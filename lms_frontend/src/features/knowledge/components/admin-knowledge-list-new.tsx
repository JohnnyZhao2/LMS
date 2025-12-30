import { Spin } from 'antd';
import {
  Plus,
  Search,
  Home,
  Database,
  Cloud,
  Network,
  Shield,
  FileText,
  Settings,
  Inbox,
  LayoutGrid,
  AppWindow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags } from '../api/get-tags';
import { SharedKnowledgeCard } from './shared-knowledge-card';
import { useKnowledgeFilters } from '../hooks/use-knowledge-filters';
import { usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { KnowledgeFilterType, Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { useState } from 'react';

/**
 * 条线类型图标映射
 */
const LINE_TYPE_ICONS: Record<string, React.ReactNode> = {
  '双云': <Cloud className="w-[18px] h-[18px]" />,
  '数据库': <Database className="w-[18px] h-[18px]" />,
  '网络': <Network className="w-[18px] h-[18px]" />,
  '应用': <AppWindow className="w-[18px] h-[18px]" />,
  '应急': <Shield className="w-[18px] h-[18px]" />,
  '规章制度': <FileText className="w-[18px] h-[18px]" />,
  '其他': <Settings className="w-[18px] h-[18px]" />,
};

/**
 * 获取条线类型图标
 */
const getLineTypeIcon = (name: string): React.ReactNode => {
  return LINE_TYPE_ICONS[name] || <FileText className="w-[18px] h-[18px]" />;
};

/**
 * 管理员知识库列表组件 - ShadCN UI 版本
 * 保持与原 Ant Design 版本完全一致的视觉效果
 */
export const AdminKnowledgeListNew: React.FC = () => {
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
    selectedSystemTagIds,
    toggleSystemTag,
    filterType,
    setFilterType,
    page,
    pageSize,
    handlePageChange,
  } = useKnowledgeFilters();

  // 获取条线类型标签
  const { data: lineTypeTags = [] } = useLineTypeTags();
  // 级联获取系统标签（根据已选条线类型）
  const { data: systemTags = [] } = useSystemTags(selectedLineTypeId);

  // 获取知识列表
  const { data, isLoading, refetch } = useAdminKnowledgeList({
    search: search || undefined,
    line_type_id: selectedLineTypeId,
    system_tag_id: selectedSystemTagIds[0],
    filter_type: filterType,
    page,
    pageSize,
  });

  // 发布和取消发布操作
  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  /**
   * 处理搜索输入回车
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitSearch();
    }
  };

  /**
   * 跳转到新建页面
   */
  const handleCreate = () => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/create`);
  };

  /**
   * 查看详情
   */
  const handleView = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}`);
  };

  /**
   * 跳转到编辑页面
   */
  const handleEdit = (id: number) => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}/edit`);
  };

  /**
   * 处理发布
   */
  const handlePublish = async (id: number) => {
    try {
      await publishKnowledge.mutateAsync(id);
      toast.success('发布成功');
      refetch();
    } catch (error) {
      showApiError(error, '发布失败');
    }
  };

  /**
   * 处理取消发布
   */
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

  /**
   * 状态筛选配置
   */
  const statusFilters: Array<{ key: KnowledgeFilterType; label: string; dotClass?: string; showIcon?: boolean }> = [
    { key: 'ALL', label: '全部视图', showIcon: true },
    { key: 'PUBLISHED_CLEAN', label: '已发布', dotClass: 'bg-green-500' },
    { key: 'REVISING', label: '修订中', dotClass: 'bg-yellow-500' },
    { key: 'UNPUBLISHED', label: '草稿', dotClass: 'bg-gray-400' },
  ];

  // 计算总页数
  const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 0;

  return (
    <div
      className="flex min-h-[calc(100vh-var(--header-height))]"
      style={{
        margin: 'calc(-1 * var(--spacing-6))',
        marginLeft: 'calc(-50vw + 50% - var(--spacing-6))',
        marginRight: 'calc(-50vw + 50% - var(--spacing-6))',
        width: '100vw',
      }}
    >
      {/* 左侧图标导航栏 */}
      <aside
        className="fixed left-0 flex flex-col items-center gap-3 z-[100] bg-transparent"
        style={{
          top: 'var(--header-height)',
          width: '100px',
          height: 'calc(100vh - var(--header-height))',
          padding: 'var(--spacing-6) var(--spacing-5)',
        }}
      >
        {/* 全部 */}
        <IconNavItem
          active={!selectedLineTypeId}
          onClick={() => handleLineTypeSelect(undefined)}
          tooltip="全部条线"
        >
          <Home className="w-[18px] h-[18px]" />
        </IconNavItem>

        {/* 条线类型图标 */}
        {lineTypeTags.map((tag: TagType) => (
          <IconNavItem
            key={tag.id}
            active={selectedLineTypeId === tag.id}
            onClick={() => handleLineTypeSelect(tag.id)}
            tooltip={tag.name}
          >
            {getLineTypeIcon(tag.name)}
          </IconNavItem>
        ))}

        {/* 创建按钮 - 吸附在侧边栏底部 */}
        <div className="mt-auto pb-4">
          <IconNavItem
            onClick={handleCreate}
            tooltip="创建知识"
            variant="primary"
          >
            <Plus className="w-[18px] h-[18px]" />
          </IconNavItem>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent ml-[100px]">
        {/* 顶部标题栏 - 三栏布局 */}
        <header
          className="grid items-center gap-4"
          style={{
            gridTemplateColumns: '1fr auto 1fr',
            padding: 'var(--spacing-5) var(--spacing-6)',
          }}
        >
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            <span className="text-lg font-semibold text-gray-900">知识库</span>
          </div>
          <div className="flex justify-center">
            <div className="relative w-[400px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-full text-sm text-gray-900 shadow-sm transition-all focus:outline-none focus:border-primary-400 focus:ring-[3px] focus:ring-primary-500/10"
                placeholder="搜索知识..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onBlur={submitSearch}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {/* 右侧预留空间，保持三栏布局平衡 */}
          </div>
        </header>

        {/* 筛选区域 */}
        <div style={{ padding: 'var(--spacing-2) var(--spacing-6) var(--spacing-1)' }}>
          {/* 系统标签筛选 */}
          <div className="flex items-center gap-1 mb-3 pb-3">
            <FilterTag
              active={selectedSystemTagIds.length === 0}
              onClick={() => toggleSystemTag(-1)}
            >
              ALL_SYSTEMS
            </FilterTag>
            {systemTags.map((tag: TagType) => (
              <FilterTag
                key={tag.id}
                active={selectedSystemTagIds.includes(tag.id)}
                onClick={() => toggleSystemTag(tag.id)}
              >
                {tag.name}
              </FilterTag>
            ))}
          </div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-1">
            {statusFilters.map((filter) => (
              <StatusTab
                key={filter.key}
                active={filterType === filter.key}
                onClick={() => setFilterType(filter.key)}
                showIcon={filter.showIcon}
                dotClass={filter.dotClass}
              >
                {filter.label}
              </StatusTab>
            ))}
          </div>
        </div>

        {/* 卡片网格区域 */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-4) var(--spacing-6)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spin size="large" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {data.results.map((item) => (
                  <SharedKnowledgeCard
                    key={item.id}
                    item={item}
                    variant="admin"
                    showActions
                    onView={handleView}
                    onEdit={handleEdit}
                    onPublish={handlePublish}
                    onUnpublish={handleUnpublish}
                  />
                ))}
              </div>

              {/* 分页 */}
              <div className="flex justify-center py-6">
                <Pagination
                  current={page}
                  total={data.count || 0}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Inbox className="w-12 h-12 text-gray-300 mb-4" />
              <span className="text-base font-medium">暂无知识文档</span>
            </div>
          )}
        </div>
      </main>

      {/* 取消发布确认对话框 */}
      <Dialog open={unpublishDialog.open} onOpenChange={(open) => setUnpublishDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认取消发布</DialogTitle>
            <DialogDescription>
              取消发布后，该知识将变为草稿状态，无法用于任务分配。确定要取消发布吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUnpublishDialog({ open: false })}>
              取消
            </Button>
            <Button onClick={confirmUnpublish} disabled={unpublishKnowledge.isPending}>
              {unpublishKnowledge.isPending ? '处理中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * 图标导航项组件
 */
interface IconNavItemProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  tooltip: string;
  variant?: 'default' | 'primary';
}

const IconNavItem: React.FC<IconNavItemProps> = ({
  children,
  active,
  onClick,
  tooltip,
  variant = 'default',
}) => {
  const isPrimary = variant === 'primary';

  return (
    <div
      className={`
        w-11 h-11 flex-shrink-0 rounded-lg flex items-center justify-center cursor-pointer
        transition-all duration-200 relative group
        ${isPrimary
          ? 'bg-primary-500 text-white shadow-[0_2px_8px_rgba(77,108,255,0.35)] hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(77,108,255,0.4)]'
          : active
            ? 'bg-primary-500 text-white shadow-[0_3px_12px_rgba(77,108,255,0.35)] hover:bg-primary-600 hover:-translate-y-0.5'
            : 'bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-primary-500 hover:shadow-[0_3px_10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5'
        }
      `}
      onClick={onClick}
    >
      {children}
      {/* Tooltip */}
      <span
        className="absolute left-[60px] top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-md text-[13px] font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-[100] shadow-lg"
      >
        {tooltip}
        <span className="absolute left-[-6px] top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-800" />
      </span>
    </div>
  );
};

/**
 * 筛选标签组件
 */
interface FilterTagProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const FilterTag: React.FC<FilterTagProps> = ({ children, active, onClick }) => (
  <span
    className={`
      px-3.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap
      ${active
        ? 'bg-white text-gray-800 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
        : 'bg-transparent text-gray-500 hover:text-gray-700'
      }
    `}
    onClick={onClick}
  >
    {children}
  </span>
);

/**
 * 状态筛选标签组件
 */
interface StatusTabProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  showIcon?: boolean;
  dotClass?: string;
}

const StatusTab: React.FC<StatusTabProps> = ({ children, active, onClick, showIcon, dotClass }) => (
  <button
    className={`
      flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap border-none
      ${active
        ? 'bg-white text-gray-800 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
        : 'bg-transparent text-gray-500 hover:text-gray-700'
      }
    `}
    onClick={onClick}
  >
    {showIcon && <LayoutGrid className="w-3.5 h-3.5" />}
    {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
    <span>{children}</span>
  </button>
);

/**
 * 分页组件
 */
interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number, pageSize: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize,
  totalPages,
  onPageChange,
}) => {
  const pageSizeOptions = [12, 20, 40, 60];

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-gray-500">共 {total} 条</span>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1, pageSize)}
        >
          上一页
        </Button>
        
        <span className="text-gray-700 font-medium px-2">
          {current} / {totalPages || 1}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1, pageSize)}
        >
          下一页
        </Button>
      </div>

      <select
        className="h-8 px-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        value={pageSize}
        onChange={(e) => onPageChange(1, Number(e.target.value))}
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size} 条/页
          </option>
        ))}
      </select>
    </div>
  );
};
