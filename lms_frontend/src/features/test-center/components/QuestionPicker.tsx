/**
 * QuestionPicker Component
 * Modal for selecting questions from the question bank
 * Requirements: 13.3 - Allow selecting existing questions from question bank
 */

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuestions } from '../api/questions/get-questions';
import { getQuestionTypeLabel, getQuestionTypeBadgeVariant } from '../api/questions/utils';
import type { QuestionListParams } from '../api/questions/types';
import type { Question, QuestionType } from '@/types/domain';
import { 
  Search, 
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface QuestionPickerProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when questions are confirmed */
  onConfirm: (questions: Question[]) => void;
  /** Already selected question IDs (to exclude or show as selected) */
  excludeIds?: number[];
  /** Title for the modal */
  title?: string;
}

const QUESTION_TYPE_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: '全部题型' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'TRUE_FALSE', label: '判断题' },
  { value: 'SHORT_ANSWER', label: '简答题' },
];

const PAGE_SIZE = 10;


export const QuestionPicker: React.FC<QuestionPickerProps> = ({
  open,
  onClose,
  onConfirm,
  excludeIds = [],
  title = '选择题目',
}) => {
  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<QuestionType | ''>('');
  const [page, setPage] = React.useState(1);
  
  // Selection state
  const [selectedQuestions, setSelectedQuestions] = React.useState<Map<number, Question>>(new Map());
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSearchTerm('');
      setTypeFilter('');
      setPage(1);
      setSelectedQuestions(new Map());
      setDebouncedSearch('');
    }
  }, [open]);
  
  // Build query params
  const queryParams: QuestionListParams = {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
  };
  
  const { data, isLoading, error, refetch } = useQuestions(queryParams);
  
  // Filter out excluded questions
  const questions = React.useMemo(() => {
    const results = data?.results || [];
    return results.filter(q => !excludeIds.includes(q.id));
  }, [data?.results, excludeIds]);
  
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  // Handle select all on current page
  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Map(selectedQuestions);
    if (checked) {
      questions.forEach(q => newSelected.set(q.id, q));
    } else {
      questions.forEach(q => newSelected.delete(q.id));
    }
    setSelectedQuestions(newSelected);
  };
  
  // Handle individual selection
  const handleSelectQuestion = (question: Question, checked: boolean) => {
    const newSelected = new Map(selectedQuestions);
    if (checked) {
      newSelected.set(question.id, question);
    } else {
      newSelected.delete(question.id);
    }
    setSelectedQuestions(newSelected);
  };
  
  // Check if all on current page are selected
  const allSelected = questions.length > 0 && questions.every(q => selectedQuestions.has(q.id));
  const someSelected = questions.some(q => selectedQuestions.has(q.id));
  
  // Handle type filter change
  const handleTypeFilterChange = (value: string | string[]) => {
    const newType = (Array.isArray(value) ? value[0] : value) as QuestionType | '';
    setTypeFilter(newType);
    setPage(1);
  };
  
  // Handle confirm
  const handleConfirm = () => {
    onConfirm(Array.from(selectedQuestions.values()));
    onClose();
  };
  
  // Render answer preview
  const renderAnswerPreview = (question: Question) => {
    if (question.type === 'SHORT_ANSWER') {
      return <span className="text-text-muted text-xs">简答题</span>;
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
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <div className="flex-1 text-sm text-text-muted">
            已选择 <strong className="text-white">{selectedQuestions.size}</strong> 道题目
          </div>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirm}
            disabled={selectedQuestions.size === 0}
          >
            确认选择
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
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
        
        {/* Selection Summary */}
        {selectedQuestions.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm text-white">
              已选择 <strong>{selectedQuestions.size}</strong> 道题目
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedQuestions(new Map())}
              className="ml-auto"
            >
              清空选择
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
            description={debouncedSearch || typeFilter ? '没有找到匹配的题目，请调整筛选条件' : '题库中暂无可选题目'}
          />
        )}
        
        {/* Question List */}
        {!isLoading && !error && questions.length > 0 && (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_100px_80px] gap-4 px-4 py-2 text-xs text-text-muted uppercase tracking-wider border-b border-white/5">
              <div>
                <Checkbox
                  checked={allSelected || (someSelected && !allSelected)}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </div>
              <div>题目内容</div>
              <div>题型</div>
              <div>答案</div>
            </div>
            
            {/* Question Items */}
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {questions.map((question) => {
                const isSelected = selectedQuestions.has(question.id);
                
                return (
                  <div 
                    key={question.id}
                    className={`grid grid-cols-[40px_1fr_100px_80px] gap-4 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectQuestion(question, !isSelected)}
                  >
                    {/* Checkbox */}
                    <div className="flex items-start" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectQuestion(question, e.target.checked)}
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="min-w-0">
                      <p className="text-white text-sm line-clamp-2">
                        {question.content}
                      </p>
                    </div>
                    
                    {/* Type Badge */}
                    <div className="flex items-start">
                      <Badge variant={getQuestionTypeBadgeVariant(question.type)} className="text-xs">
                        {getQuestionTypeLabel(question.type)}
                      </Badge>
                    </div>
                    
                    {/* Answer */}
                    <div className="flex items-start">
                      {renderAnswerPreview(question)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
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
      </div>
    </Modal>
  );
};

QuestionPicker.displayName = 'QuestionPicker';
