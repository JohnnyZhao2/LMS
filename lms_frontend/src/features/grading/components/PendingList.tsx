/**
 * PendingList Component
 * Display list of submissions pending grading
 * Requirements: 15.1 - 展示待评分考试列表
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  usePendingGradingList,
  type PendingGradingItem,
  type GradingFilterParams,
} from '../api/grading';
import { 
  Search, 
  FileCheck,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export interface PendingListProps {
  /** Callback when a submission is selected for grading */
  onSelectSubmission?: (submission: PendingGradingItem) => void;
  /** Currently selected submission ID */
  selectedId?: number;
}

const PAGE_SIZE = 10;

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}天前`;
  } else if (diffHours > 0) {
    return `${diffHours}小时前`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 ? `${diffMinutes}分钟前` : '刚刚';
  }
}

export const PendingList: React.FC<PendingListProps> = ({
  onSelectSubmission,
  selectedId,
}) => {
  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(1);
  
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
  const queryParams: GradingFilterParams = {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
  };
  
  const { data, isLoading, error, refetch } = usePendingGradingList(queryParams);
  
  const submissions = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  return (
    <Card className="glass-panel border-white/5 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <FileCheck className="text-amber-400" size={20} />
          </div>
          <div>
            <CardTitle>待评分列表</CardTitle>
            <CardDescription>
              {totalCount > 0 ? `共 ${totalCount} 份待评分` : '暂无待评分试卷'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <Input 
            placeholder="搜索学员姓名或任务名称..." 
            className="pl-10 bg-black/20 border-white/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <AlertCircle className="text-red-400 mb-4" size={48} />
            <p className="text-red-400 mb-4">加载失败</p>
            <Button variant="secondary" onClick={() => refetch()}>
              重试
            </Button>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && submissions.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="暂无待评分试卷"
              description={debouncedSearch ? '没有找到匹配的记录' : '所有试卷都已评分完成'}
            />
          </div>
        )}
        
        {/* Submission List */}
        {!isLoading && !error && submissions.length > 0 && (
          <div className="flex-1 overflow-auto space-y-2">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                onClick={() => onSelectSubmission?.(submission)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${selectedId === submission.id 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                  }
                `}
              >
                {/* Header: Student & Task */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <User size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {submission.user.real_name}
                      </p>
                      <p className="text-text-muted text-xs">
                        {submission.user.employee_id}
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-xs">
                    待评分
                  </Badge>
                </div>
                
                {/* Task & Quiz Info */}
                <div className="mb-2">
                  <p className="text-white/80 text-sm truncate">
                    {submission.task.title}
                  </p>
                  <p className="text-text-muted text-xs truncate">
                    试卷：{submission.quiz.title}
                  </p>
                </div>
                
                {/* Footer: Score & Time */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-text-muted">
                      自动得分：
                      <span className="text-primary font-medium">
                        {submission.auto_score}
                      </span>
                      /{submission.total_score}
                    </span>
                    <span className="text-amber-400">
                      {submission.pending_questions_count} 题待评
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-text-muted">
                    <Clock size={12} />
                    <span title={formatDate(submission.submitted_at)}>
                      {formatRelativeTime(submission.submitted_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
            <div className="text-xs text-text-muted">
              第 {page}/{totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

PendingList.displayName = 'PendingList';
