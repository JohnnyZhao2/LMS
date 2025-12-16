/**
 * TaskCard Component
 * Display task information in a card format
 * Requirements: 6.4 - 展示任务标题、类型、状态、截止时间和进度
 */

import { cn } from '@/utils/cn';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  BookOpen, 
  Target, 
  GraduationCap, 
  Clock, 
  User,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import type { TaskAssignment, TaskType, TaskAssignmentStatus } from '@/types/domain';

// ============================================
// Types
// ============================================

interface TaskCardProps {
  assignment: TaskAssignment;
  onClick?: () => void;
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function getTypeConfig(type: TaskType) {
  switch (type) {
    case 'LEARNING':
      return {
        icon: BookOpen,
        label: '学习任务',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    case 'PRACTICE':
      return {
        icon: Target,
        label: '练习任务',
        color: 'text-accent',
        bgColor: 'bg-accent/10',
      };
    case 'EXAM':
      return {
        icon: GraduationCap,
        label: '考试任务',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      };
  }
}

function getStatusConfig(status: TaskAssignmentStatus) {
  switch (status) {
    case 'IN_PROGRESS':
      return {
        label: '进行中',
        variant: 'warning' as const,
      };
    case 'COMPLETED':
      return {
        label: '已完成',
        variant: 'success' as const,
      };
    case 'OVERDUE':
      return {
        label: '已逾期',
        variant: 'destructive' as const,
      };
    case 'PENDING_EXAM':
      return {
        label: '待考试',
        variant: 'default' as const,
      };
  }
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `已逾期 ${Math.abs(diffDays)} 天`;
  } else if (diffDays === 0) {
    return '今天截止';
  } else if (diffDays === 1) {
    return '明天截止';
  } else if (diffDays <= 7) {
    return `${diffDays} 天后截止`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

function isUrgent(deadline: string, status: TaskAssignmentStatus): boolean {
  if (status === 'COMPLETED') return false;
  const date = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
}

// ============================================
// Component
// ============================================

export function TaskCard({ assignment, onClick, className }: TaskCardProps) {
  const { task, status, progress } = assignment;
  const typeConfig = getTypeConfig(task.type);
  const statusConfig = getStatusConfig(status);
  const TypeIcon = typeConfig.icon;
  const urgent = isUrgent(task.deadline, status);

  return (
    <Card 
      className={cn(
        'glass-panel border-white/5 hover:border-primary/30 transition-all cursor-pointer group',
        urgent && status !== 'COMPLETED' && 'border-l-2 border-l-destructive',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Type Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            typeConfig.bgColor,
            'group-hover:scale-105'
          )}>
            <TypeIcon size={24} className={typeConfig.color} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] border-white/10">
                  {typeConfig.label}
                </Badge>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
                {urgent && status !== 'COMPLETED' && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertTriangle size={10} className="mr-1" />
                    紧急
                  </Badge>
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors truncate mb-1">
              {task.title}
            </h3>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                {task.description}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span className={cn(urgent && status !== 'COMPLETED' && 'text-destructive')}>
                  {formatDeadline(task.deadline)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <User size={12} />
                <span>{task.created_by.real_name}</span>
              </div>
            </div>

            {/* Progress Bar */}
            {status !== 'COMPLETED' && progress > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted">进度</span>
                  <span className="text-primary font-medium">{progress}%</span>
                </div>
                <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Arrow */}
          <div className="shrink-0 self-center">
            <ChevronRight 
              size={20} 
              className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Compact Version
// ============================================

interface TaskCardCompactProps {
  assignment: TaskAssignment;
  onClick?: () => void;
}

export function TaskCardCompact({ assignment, onClick }: TaskCardCompactProps) {
  const { task, status, progress } = assignment;
  const typeConfig = getTypeConfig(task.type);
  const statusConfig = getStatusConfig(status);
  const TypeIcon = typeConfig.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', typeConfig.bgColor)}>
        <TypeIcon size={16} className={typeConfig.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{task.title}</div>
        <div className="text-xs text-text-muted">{formatDeadline(task.deadline)}</div>
      </div>
      <Badge variant={statusConfig.variant} className="text-[10px]">
        {progress}%
      </Badge>
    </button>
  );
}

export default TaskCard;
