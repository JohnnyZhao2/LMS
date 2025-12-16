/**
 * TaskList Component
 * Combines TaskFilter and TaskCard list
 * Requirements: 6.1 - 展示任务列表
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskFilter, TaskFilterCompact, type TaskTypeFilter, type TaskStatusFilter } from './TaskFilter';
import { TaskCard } from './TaskCard';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Search, ClipboardList } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TaskAssignment } from '@/types/domain';

// ============================================
// Types
// ============================================

interface TaskListProps {
  assignments: TaskAssignment[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onTaskClick?: (assignment: TaskAssignment) => void;
  className?: string;
}

// ============================================
// Component
// ============================================

export function TaskList({
  assignments,
  isLoading,
  error,
  onRetry,
  onTaskClick,
  className,
}: TaskListProps) {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      // Type filter
      if (typeFilter !== 'ALL' && assignment.task.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && assignment.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = assignment.task.title.toLowerCase().includes(query);
        const matchesDescription = assignment.task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, typeFilter, statusFilter, searchQuery]);

  // Handle task click
  const handleTaskClick = (assignment: TaskAssignment) => {
    if (onTaskClick) {
      onTaskClick(assignment);
    } else {
      // Default navigation based on task type
      const { task } = assignment;
      switch (task.type) {
        case 'LEARNING':
          navigate(`/tasks/learning/${assignment.id}`);
          break;
        case 'PRACTICE':
          navigate(`/tasks/practice/${assignment.id}`);
          break;
        case 'EXAM':
          navigate(`/tasks/exam/${assignment.id}`);
          break;
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="加载失败"
        message={error.message || '无法加载任务列表'}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
        <Input
          placeholder="搜索任务..."
          className="pl-10 bg-background-tertiary border-white/10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:block">
        <TaskFilter
          selectedType={typeFilter}
          selectedStatus={statusFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Filters - Mobile */}
      <div className="md:hidden">
        <TaskFilterCompact
          selectedType={typeFilter}
          selectedStatus={statusFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">
          共 <span className="text-white font-medium">{filteredAssignments.length}</span> 个任务
        </span>
        {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setTypeFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* Task Cards */}
      {filteredAssignments.length > 0 ? (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <TaskCard
              key={assignment.id}
              assignment={assignment}
              onClick={() => handleTaskClick(assignment)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="暂无任务"
          description={
            searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? '没有符合筛选条件的任务'
              : '当前没有分配给您的任务'
          }
        />
      )}
    </div>
  );
}

export default TaskList;
