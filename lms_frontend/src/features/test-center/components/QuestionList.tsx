/**
 * QuestionList Component
 * Display question list with search, filter, selection, and quick quiz creation
 * Requirements: 12.1, 12.5, 12.6, 12.8, 12.9 - Question list with ownership control
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  useQuestions, 
  useDeleteQuestion,
  canEditQuestion,
  getQuestionTypeLabel,
  getQuestionTypeBadgeVariant,
  type QuestionListParams,
} from '../api/questions';
import { useAuthStore } from '@/stores/auth';
import type { Question, QuestionType } from '@/types/domain';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface QuestionListProps {
  /** Callback when create button is clicked */
  onCreateClick?: () => void;
  /** Callback when edit button is clicked */
  onEditClick?: (question: Question) => void;
  /** Callback when quick quiz button is clicked with selected questions */
  onQuickQuizClick?: (questions: Question[]) => void;
}

const QUESTION_TYPE_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: '全部题型' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'TRUE_FALSE', label: '判断题' },
  { value: 'SHORT_ANSWER', label: '简答题' },
];

const PAGE_SIZE = 10;


export const QuestionList: React.FC<QuestionListProps> = ({
  onCreateClick,
  onEditClick,
  onQuickQuizClick,
}) => {
  const { user, currentRole } = useAuthStore();
  const isAdmin = currentRole === 'ADMIN';
  
  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<QuestionType | ''>('');
  const [page, setPage] = React.useState(1);
  
  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Build query params
  const queryParams: QuestionListParams = {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
  };
  
  const { data, isLoading, error, refetch } = useQuestions(queryParams);
  const deleteQuestion = useDeleteQuestion();
  
  const questions = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  // Get selected questions
  const selectedQuestions = React.useMemo(() => {
    return questions.filter(q => selectedIds.has(q.id));
  }, [questions, selectedIds]);
  
  // Handle select all on current page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      questions.forEach(q => newSelected.add(q.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      questions.forEach(q => newSelected.delete(q.id));
      setSelectedIds(newSelected);
    }
  };
  
  // Handle individual selection
  const handleSelectQuestion = (questionId: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(questionId);
    } else {
      newSelected.delete(questionId);
    }
    setSelectedIds(newSelected);
  };
  
  // Check if all on current page are selected
  const allSelected = questions.length > 0 && questions.every(q => selectedIds.has(q.id));
  const someSelected = questions.some(q => selectedIds.has(q.id));
  
  // Handle delete
  const handleDelete = async (question: Question) => {
    if (!confirm(`确定要删除题目 "${question.content.substring(0, 30)}..." 吗？`)) {
      return;
    }
    
    try {
      await deleteQuestion.mutateAsync(question.id);
      // Remove from selection if selected
      if (selectedIds.has(question.id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(question.id);
        setSelectedIds(newSelected);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };
  
  // Handle type filter change
  const handleTypeFilterChange = (value: string | string[]) => {
    const newType = (Array.isArray(value) ? value[0] : value) as QuestionType | '';
    setTypeFilter(newType);
    setPage(1);
  };
  
  // Handle quick quiz click
  const handleQuickQuizClick = () => {
    if (selectedQuestions.length > 0 && onQuickQuizClick) {
      onQuickQuizClick(selectedQuestions);
    }
  };
  
  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };
  
  // Render answer preview
  const renderAnswerPreview = (question: Question) => {
    if (question.type === 'SHORT_ANSWER') {
      const answer = typeof question.answer === 'string' ? question.answer : '';
      return (
        <span className="text-text-muted text-xs truncate max-w-[200px] inline-block">
          {answer.substring(0, 50)}{answer.length > 50 ? '...' : ''}
        </span>
      );
    }
    
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
    return (
      <div className="flex gap-1">
        {answers.map(a => (
          <span 
            key={a} 
            className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary text-xs font-mono"
          >
            {a}
          </span>
        ))}
      </div>
    );
  };
  
  // Get current user ID for ownership check
  const currentUserId = user?.id ? parseInt(user.id) : undefined;
  
  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>题目库</CardTitle>
          <CardDescription>
            管理题库中的所有题目，支持搜索、筛选和快速组卷
          </CardDescription>
        </div>
        <Button className="gap-2" onClick={onCreateClick}>
          <Plus size={16} /> 新建题目
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <Input 
              placeholder="搜索题目内容..." 
              className="pl-10 bg-black/20 border-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            options={QUESTION_TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={handleTypeFilterChange}
            className="w-full md:w-40"
          />
        </div>
        
        {/* Selection Actions Bar */}
        {/* Requirements: 12.8, 12.9 - Multi-select and quick quiz */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm text-white">
              已选择 <strong>{selectedIds.size}</strong> 道题目
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
              onClick={handleQuickQuizClick}
              className="gap-2"
            >
              <FileText size={14} />
              快速组卷
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
        {!isLoading && !error && questions.length === 0 && (
          <EmptyState
            title="暂无题目"
            description={debouncedSearch || typeFilter ? '没有找到匹配的题目，请调整筛选条件' : '点击"新建题目"开始创建'}
            actionText={!debouncedSearch && !typeFilter ? '新建题目' : undefined}
            onAction={!debouncedSearch && !typeFilter ? onCreateClick : undefined}
          />
        )}
        
        {/* Question List */}
        {!isLoading && !error && questions.length > 0 && (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[40px_1fr_120px_100px_120px_100px] gap-4 px-4 py-2 text-xs text-text-muted uppercase tracking-wider border-b border-white/5">
              <div>
                <Checkbox
                  checked={allSelected || (someSelected && !allSelected)}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </div>
              <div>题目内容</div>
              <div>题型</div>
              <div>答案</div>
              <div>创建者</div>
              <div className="text-right">操作</div>
            </div>
            
            {/* Question Items */}
            <div className="divide-y divide-white/5">
              {questions.map((question) => {
                const canEdit = canEditQuestion(question, currentUserId, isAdmin);
                const isSelected = selectedIds.has(question.id);
                
                return (
                  <div 
                    key={question.id}
                    className={`grid grid-cols-1 md:grid-cols-[40px_1fr_120px_100px_120px_100px] gap-4 px-4 py-4 hover:bg-white/5 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-start">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectQuestion(question.id, e.target.checked)}
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="min-w-0">
                      <p className="text-white text-sm line-clamp-2 mb-1">
                        {question.content}
                      </p>
                      {question.options && question.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {question.options.slice(0, 4).map((opt) => (
                            <span 
                              key={opt.key}
                              className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded"
                            >
                              {opt.key}. {opt.content.substring(0, 15)}{opt.content.length > 15 ? '...' : ''}
                            </span>
                          ))}
                          {question.options.length > 4 && (
                            <span className="text-xs text-text-muted">
                              +{question.options.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Type Badge */}
                    <div className="flex items-start">
                      <Badge variant={getQuestionTypeBadgeVariant(question.type)}>
                        {getQuestionTypeLabel(question.type)}
                      </Badge>
                    </div>
                    
                    {/* Answer */}
                    <div className="flex items-start">
                      {renderAnswerPreview(question)}
                    </div>
                    
                    {/* Creator */}
                    <div className="flex items-start">
                      <span className="text-sm text-text-muted truncate">
                        {question.created_by.real_name}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    {/* Requirements: 12.5, 12.6 - Ownership-based edit/delete control */}
                    <div className="flex items-start justify-end gap-2">
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditClick?.(question)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(question)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            loading={deleteQuestion.isPending}
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
                  共 {totalCount} 道题目，第 {page}/{totalPages} 页
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

QuestionList.displayName = 'QuestionList';
