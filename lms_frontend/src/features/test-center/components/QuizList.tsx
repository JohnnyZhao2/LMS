/**
 * QuizList Component
 * Display quiz list with search, selection, and quick publish
 * Requirements: 13.1, 13.5, 13.6, 13.10 - Quiz list with ownership control and quick publish
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuizzes } from '../api/quizzes/get-quizzes';
import { useDeleteQuiz } from '../api/quizzes/delete-quiz';
import { canEditQuiz } from '../api/quizzes/utils';
import type { QuizListParams } from '../api/quizzes/types';
import { useAuthStore } from '@/stores/auth';
import type { Quiz } from '@/types/domain';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from 'lucide-react';

export interface QuizListProps {
  /** Callback when create button is clicked */
  onCreateClick?: () => void;
  /** Callback when edit button is clicked */
  onEditClick?: (quiz: Quiz) => void;
  /** Callback when quick publish button is clicked with selected quizzes */
  onQuickPublishClick?: (quizzes: Quiz[]) => void;
}

const PAGE_SIZE = 10;


export const QuizList: React.FC<QuizListProps> = ({
  onCreateClick,
  onEditClick,
  onQuickPublishClick,
}) => {
  const { user, currentRole } = useAuthStore();
  const isAdmin = currentRole === 'ADMIN';
  
  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(1);
  
  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Build query params
  const queryParams: QuizListParams = {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
  };
  
  const { data, isLoading, error, refetch } = useQuizzes(queryParams);
  const deleteQuiz = useDeleteQuiz();
  
  const quizzes = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  // Get selected quizzes
  const selectedQuizzes = React.useMemo(() => {
    return quizzes.filter(q => selectedIds.has(q.id));
  }, [quizzes, selectedIds]);
  
  // Handle select all on current page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      quizzes.forEach(q => newSelected.add(q.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      quizzes.forEach(q => newSelected.delete(q.id));
      setSelectedIds(newSelected);
    }
  };
  
  // Handle individual selection
  const handleSelectQuiz = (quizId: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(quizId);
    } else {
      newSelected.delete(quizId);
    }
    setSelectedIds(newSelected);
  };
  
  // Check if all on current page are selected
  const allSelected = quizzes.length > 0 && quizzes.every(q => selectedIds.has(q.id));
  const someSelected = quizzes.some(q => selectedIds.has(q.id));
  
  // Handle delete
  const handleDelete = async (quiz: Quiz) => {
    if (!confirm(`确定要删除试卷 "${quiz.title}" 吗？`)) {
      return;
    }
    
    try {
      await deleteQuiz.mutateAsync(quiz.id);
      // Remove from selection if selected
      if (selectedIds.has(quiz.id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(quiz.id);
        setSelectedIds(newSelected);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };
  
  // Handle quick publish click
  const handleQuickPublishClick = () => {
    if (selectedQuizzes.length > 0 && onQuickPublishClick) {
      onQuickPublishClick(selectedQuizzes);
    }
  };
  
  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };
  
  // Get current user ID for ownership check
  const currentUserId = user?.id ? parseInt(user.id) : undefined;
  
  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>试卷库</CardTitle>
          <CardDescription>
            管理所有试卷资源，支持搜索和快速发布任务
          </CardDescription>
        </div>
        <Button className="gap-2" onClick={onCreateClick}>
          <Plus size={16} /> 新建试卷
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <Input 
              placeholder="搜索试卷名称..." 
              className="pl-10 bg-black/20 border-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Selection Actions Bar */}
        {/* Requirements: 13.10 - Multi-select and quick publish */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm text-white">
              已选择 <strong>{selectedIds.size}</strong> 份试卷
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
            >
              取消选择
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleQuickPublishClick}
              className="gap-2"
            >
              <Rocket size={14} />
              快速发布
            </Button>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">加载失败</p>
            <Button variant="secondary" onClick={() => refetch()}>
              重试
            </Button>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && quizzes.length === 0 && (
          <EmptyState
            title="暂无试卷"
            description={debouncedSearch ? '没有找到匹配的试卷，请调整搜索条件' : '点击"新建试卷"开始创建'}
            actionText={!debouncedSearch ? '新建试卷' : undefined}
            onAction={!debouncedSearch ? onCreateClick : undefined}
          />
        )}
        
        {/* Quiz List */}
        {!isLoading && !error && quizzes.length > 0 && (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[40px_1fr_100px_100px_120px_100px] gap-4 px-4 py-2 text-xs text-text-muted uppercase tracking-wider border-b border-white/5">
              <div>
                <Checkbox
                  checked={allSelected || (someSelected && !allSelected)}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </div>
              <div>试卷名称</div>
              <div>题目数</div>
              <div>总分</div>
              <div>创建者</div>
              <div className="text-right">操作</div>
            </div>
            
            {/* Quiz Items */}
            <div className="divide-y divide-white/5">
              {quizzes.map((quiz) => {
                const canEdit = canEditQuiz(quiz, currentUserId, isAdmin);
                const isSelected = selectedIds.has(quiz.id);
                
                return (
                  <div 
                    key={quiz.id}
                    className={`grid grid-cols-1 md:grid-cols-[40px_1fr_100px_100px_120px_100px] gap-4 px-4 py-4 hover:bg-white/5 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-start">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectQuiz(quiz.id, e.target.checked)}
                      />
                    </div>
                    
                    {/* Title and Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={16} className="text-primary shrink-0" />
                        <p className="text-white font-medium truncate">
                          {quiz.title}
                        </p>
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-text-muted line-clamp-1">
                          {quiz.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Question Count */}
                    <div className="flex items-start">
                      <Badge variant="secondary">
                        {quiz.questions.length} 题
                      </Badge>
                    </div>
                    
                    {/* Total Score */}
                    <div className="flex items-start">
                      <span className="text-sm font-mono text-primary">
                        {quiz.total_score} 分
                      </span>
                    </div>
                    
                    {/* Creator */}
                    <div className="flex items-start">
                      <span className="text-sm text-text-muted truncate">
                        {quiz.created_by.real_name}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    {/* Requirements: 13.5, 13.6 - Ownership-based edit/delete control */}
                    <div className="flex items-start justify-end gap-2">
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditClick?.(quiz)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(quiz)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            loading={deleteQuiz.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-white/5">
                <div className="text-sm text-text-muted">
                  共 {totalCount} 份试卷，第 {page}/{totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                    上一页
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    下一页
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

QuizList.displayName = 'QuizList';
