/**
 * KnowledgeManagement Page
 * Admin page for managing knowledge documents with CRUD operations
 * Requirements: 17.1, 17.6, 17.7 - Knowledge list, edit, delete with confirmation
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, type TableColumn } from '@/components/ui/Table';
import { CategoryFilterPills, type CategoryFilterValue } from './components/CategoryFilter';
import { KnowledgeForm } from './components/KnowledgeForm';
import { useAdminKnowledgeList } from './api/get-admin-knowledge-list';
import { useDeleteKnowledge } from './api/delete-knowledge';
import type { Knowledge } from '@/types/domain';
import type { KnowledgeFilterParams } from '@/types/api';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  BookOpen,
  AlertTriangle,
  Eye,
  Database
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * Helper function to format relative time
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
  } catch {
    return dateString;
  }
}

export function KnowledgeManagement() {
  const navigate = useNavigate();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>({
    primaryCategory: null,
    secondaryCategory: null,
  });
  const [page, setPage] = useState(1);
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingKnowledge, setDeletingKnowledge] = useState<Knowledge | null>(null);
  
  // Build filter params
  const filterParams: KnowledgeFilterParams = {
    page,
    page_size: 10,
    search: searchQuery || undefined,
    primary_category: categoryFilter.primaryCategory || undefined,
    secondary_category: categoryFilter.secondaryCategory || undefined,
  };
  
  // Fetch knowledge list
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useAdminKnowledgeList(filterParams);
  
  const deleteKnowledge = useDeleteKnowledge();
  
  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);
  
  // Handle category change
  const handleCategoryChange = useCallback((value: CategoryFilterValue) => {
    setCategoryFilter(value);
    setPage(1);
  }, []);
  
  // Handle create
  const handleCreate = () => {
    setEditingKnowledge(null);
    setIsFormOpen(true);
  };
  
  // Handle edit
  const handleEdit = (knowledge: Knowledge) => {
    setEditingKnowledge(knowledge);
    setIsFormOpen(true);
  };
  
  // Handle view
  const handleView = (knowledge: Knowledge) => {
    navigate(`/knowledge/${knowledge.id}`);
  };
  
  // Handle delete confirmation
  // Requirements: 17.7 - Delete confirmation dialog
  const handleDeleteClick = (knowledge: Knowledge) => {
    setDeletingKnowledge(knowledge);
    setDeleteConfirmOpen(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deletingKnowledge) return;
    
    try {
      await deleteKnowledge.mutateAsync(deletingKnowledge.id);
      setDeleteConfirmOpen(false);
      setDeletingKnowledge(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Table columns
  // Requirements: 17.1 - Display knowledge list
  const columns: TableColumn<Knowledge>[] = useMemo(() => [
    {
      key: 'title',
      title: '标题',
      width: '40%',
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-white">{record.title}</span>
          <span className="text-xs text-text-muted line-clamp-1">{record.summary}</span>
        </div>
      ),
    },
    {
      key: 'knowledge_type',
      title: '类型',
      render: (_, record) => {
        const isEmergency = record.knowledge_type === 'EMERGENCY';
        return (
          <Badge variant={isEmergency ? 'destructive' : 'secondary'} className="text-xs">
            {isEmergency ? (
              <>
                <AlertTriangle size={10} className="mr-1" />
                应急预案
              </>
            ) : (
              <>
                <BookOpen size={10} className="mr-1" />
                普通知识
              </>
            )}
          </Badge>
        );
      },
    },
    {
      key: 'category',
      title: '分类',
      render: (_, record) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{record.primary_category?.name || '-'}</span>
          {record.secondary_category && (
            <span className="text-xs text-text-muted">{record.secondary_category.name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'updated_at',
      title: '更新时间',
      render: (_, record) => (
        <span className="text-sm text-text-muted">
          {formatRelativeTime(record.updated_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      align: 'right',
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleView(record);
            }}
            className="h-8 w-8 p-0 text-text-muted hover:text-white"
            title="查看"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
            className="h-8 w-8 p-0 text-text-muted hover:text-primary"
            title="编辑"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(record);
            }}
            className="h-8 w-8 p-0 text-text-muted hover:text-red-400"
            title="删除"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [handleView, handleEdit, handleDeleteClick]);
  
  const results = data?.results ?? [];
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
            <Database className="text-primary" /> 知识库管理
          </h1>
          <p className="text-text-muted mt-1">
            管理平台知识文档，包括应急预案和操作规范。
          </p>
        </div>
        
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={18} className="mr-2" />
          新建知识
        </Button>
      </div>
      
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
            <Input
              placeholder="搜索知识文档..."
              className="pl-9 bg-background-tertiary border-white/10 focus:border-primary/50"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-text-muted hover:text-white"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            <span className="ml-2">刷新</span>
          </Button>
        </div>
        
        {/* Category Filter */}
        <CategoryFilterPills
          value={categoryFilter}
          onChange={handleCategoryChange}
        />
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}
      
      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="加载失败"
          message={error instanceof Error ? error.message : '无法加载知识列表'}
          onRetry={() => refetch()}
        />
      )}
      
      {/* Empty State */}
      {!isLoading && !error && results.length === 0 && (
        <EmptyState
          icon={<BookOpen size={48} className="opacity-20" />}
          title="暂无知识文档"
          description={
            searchQuery || categoryFilter.primaryCategory
              ? '没有找到符合条件的知识文档，请尝试调整筛选条件'
              : '点击"新建知识"按钮创建第一个知识文档'
          }
          actionText={!searchQuery && !categoryFilter.primaryCategory ? '新建知识' : undefined}
          onAction={!searchQuery && !categoryFilter.primaryCategory ? handleCreate : undefined}
        />
      )}
      
      {/* Knowledge Table */}
      {/* Requirements: 17.1 - Display knowledge list */}
      {!isLoading && !error && results.length > 0 && (
        <div className="glass-panel border border-white/10 rounded-lg overflow-hidden">
          <Table
            columns={columns}
            dataSource={results}
            rowKey="id"
            loading={isFetching}
            pagination={data ? {
              current: page,
              pageSize: 10,
              total: data.count,
              onChange: handlePageChange,
            } : undefined}
          />
        </div>
      )}
      
      {/* Knowledge Form Modal */}
      <KnowledgeForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        knowledge={editingKnowledge}
        onSuccess={handleFormSuccess}
      />
      
      {/* Delete Confirmation Modal */}
      {/* Requirements: 17.7 - Delete confirmation dialog */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="确认删除"
        size="sm"
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteKnowledge.isPending}
            >
              取消
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteConfirm}
              loading={deleteKnowledge.isPending}
            >
              确认删除
            </Button>
          </>
        }
      >
        <div className="text-text-secondary">
          <p>确定要删除知识文档 <span className="text-white font-medium">"{deletingKnowledge?.title}"</span> 吗？</p>
          <p className="mt-2 text-sm text-text-muted">此操作不可撤销。</p>
        </div>
      </Modal>
    </div>
  );
}
