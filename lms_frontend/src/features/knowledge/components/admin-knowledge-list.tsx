import { Spinner } from '@/components/ui/spinner';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminKnowledgeList } from '../api/get-admin-knowledge';
import { useLineTypeTags } from '../api/get-tags';
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
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import type { KnowledgeFilterType, Tag as TagType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { useState } from 'react';
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
  } = useKnowledgeFilters({ defaultPageSize: 12 });

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
    { key: 'PUBLISHED_CLEAN', label: '已发布', dotClass: 'bg-success-500' },
    { key: 'REVISING', label: '修订中', dotClass: 'bg-warning-500' },
    { key: 'UNPUBLISHED', label: '草稿', dotClass: 'bg-gray-400' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="知识库管理"
        subtitle="Repository & Content Management"
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
              onClick={handleCreate}
              className="btn-gradient h-12 px-6 rounded-xl text-white font-bold shadow-md shadow-primary-500/20 hover:scale-105 transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              新建知识
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* 左侧侧边栏 */}
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

          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">状态筛选</h4>
            <div className="space-y-1 px-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                    filterType === filter.key
                      ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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
            <span className="text-sm font-bold text-gray-400">
              找到 <span className="text-gray-900">{data?.count || 0}</span> 篇相关知识
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.results.map((item, index) => (
                  <div key={item.id} className={cn("reveal-item", `stagger-delay-${(index % 4) + 1}`)}>
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

              {data.count > pageSize && (
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
            <div className="flex flex-col items-center justify-center py-32 bg-white/30 rounded-[2rem] border-2 border-dashed border-gray-100">
              <Inbox className="w-16 h-16 text-gray-200 mb-4" />
              <span className="text-lg font-bold text-gray-400">暂无知识文档</span>
            </div>
          )}
        </div>
      </div>

      {/* 取消发布确认对话框 */}
      <Dialog open={unpublishDialog.open} onOpenChange={(open) => setUnpublishDialog({ open })}>
        <DialogContent className="rounded-[2rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-warning-50 text-warning-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <Shield className="h-10 w-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">确认下线此知识？</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
              取消发布后，该知识将变为草稿状态，学员将无法查看，也无法用于任务分配。确定要取消发布吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-bold" onClick={() => setUnpublishDialog({ open: false })}>
              取消
            </Button>
            <Button
              onClick={confirmUnpublish}
              disabled={unpublishKnowledge.isPending}
              className="flex-1 bg-gray-900 text-white rounded-2xl h-14 font-bold shadow-xl shadow-gray-900/20"
            >
              {unpublishKnowledge.isPending ? '正在处理...' : '下线文档'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

