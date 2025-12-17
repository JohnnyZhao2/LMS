/**
 * SpotCheckList Component
 * Display list of spot check records (ordered by time descending)
 * Requirements: 16.1 - 展示抽查记录列表（按时间倒序）
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSpotCheckList } from '../api/get-spot-check-list';
import type { SpotCheckListItem, SpotCheckFilterParams } from '../api/types';
import { 
  Search, 
  ClipboardList,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Star,
  MessageSquare,
} from 'lucide-react';

export interface SpotCheckListProps {
  /** Callback when a spot check is selected */
  onSelectSpotCheck?: (spotCheck: SpotCheckListItem) => void;
  /** Currently selected spot check ID */
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

/**
 * Get score badge variant based on score
 */
function getScoreBadgeVariant(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'destructive';
}

export const SpotCheckList: React.FC<SpotCheckListProps> = ({
  onSelectSpotCheck,
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
  const queryParams: SpotCheckFilterParams = {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
  };
  
  const { data, isLoading, error, refetch } = useSpotCheckList(queryParams);
  
  const spotChecks = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  return (
    <Card className="glass-panel border-white/5 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <ClipboardList className="text-emerald-400" size={20} />
          </div>
          <div>
            <CardTitle>抽查记录</CardTitle>
            <CardDescription>
              {totalCount > 0 ? `共 ${totalCount} 条记录` : '暂无抽查记录'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <Input 
            placeholder="搜索学员姓名或抽查内容..." 
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
        {!isLoading && !error && spotChecks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="暂无抽查记录"
              description={debouncedSearch ? '没有找到匹配的记录' : '点击右侧"新建抽查"开始录入'}
            />
          </div>
        )}
        
        {/* Spot Check List */}
        {!isLoading && !error && spotChecks.length > 0 && (
          <div className="flex-1 overflow-auto space-y-2">
            {spotChecks.map((spotCheck) => (
              <div
                key={spotCheck.id}
                onClick={() => onSelectSpotCheck?.(spotCheck)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${selectedId === spotCheck.id 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                  }
                `}
              >
                {/* Header: Student & Score */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
                      <User size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {spotCheck.student.real_name}
                      </p>
                      <p className="text-text-muted text-xs">
                        {spotCheck.student.employee_id}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getScoreBadgeVariant(spotCheck.score)}>
                    <Star size={12} className="mr-1" />
                    {spotCheck.score}分
                  </Badge>
                </div>
                
                {/* Content Preview */}
                <div className="mb-2">
                  <p className="text-white/80 text-sm line-clamp-2">
                    {spotCheck.content}
                  </p>
                </div>
                
                {/* Comment Preview (if exists) */}
                {spotCheck.comment && (
                  <div className="mb-2 flex items-start gap-1 text-xs text-text-muted">
                    <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{spotCheck.comment}</span>
                  </div>
                )}
                
                {/* Footer: Checker & Time */}
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>
                    抽查人：{spotCheck.checked_by.real_name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span title={formatDate(spotCheck.checked_at)}>
                      {formatRelativeTime(spotCheck.checked_at)}
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

SpotCheckList.displayName = 'SpotCheckList';

export default SpotCheckList;
