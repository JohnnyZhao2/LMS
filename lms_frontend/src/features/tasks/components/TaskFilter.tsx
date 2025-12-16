/**
 * TaskFilter Component
 * Filter tasks by type and status
 * Requirements: 6.2, 6.3
 */

import { cn } from '@/utils/cn';
import { BookOpen, Target, GraduationCap, Clock, CheckCircle, AlertTriangle, LayoutGrid } from 'lucide-react';
import type { TaskType } from '@/types/domain';

// ============================================
// Types
// ============================================

export type TaskTypeFilter = TaskType | 'ALL';
export type TaskStatusFilter = 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'ALL';

interface TaskFilterProps {
  selectedType: TaskTypeFilter;
  selectedStatus: TaskStatusFilter;
  onTypeChange: (type: TaskTypeFilter) => void;
  onStatusChange: (status: TaskStatusFilter) => void;
  className?: string;
}

// ============================================
// Filter Options
// ============================================

const TYPE_OPTIONS: { id: TaskTypeFilter; label: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: '全部', icon: LayoutGrid },
  { id: 'LEARNING', label: '学习', icon: BookOpen },
  { id: 'PRACTICE', label: '练习', icon: Target },
  { id: 'EXAM', label: '考试', icon: GraduationCap },
];

const STATUS_OPTIONS: { id: TaskStatusFilter; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'ALL', label: '全部状态', icon: LayoutGrid, color: 'text-text-muted' },
  { id: 'IN_PROGRESS', label: '进行中', icon: Clock, color: 'text-warning' },
  { id: 'COMPLETED', label: '已完成', icon: CheckCircle, color: 'text-success' },
  { id: 'OVERDUE', label: '已逾期', icon: AlertTriangle, color: 'text-destructive' },
];

// ============================================
// Component
// ============================================

export function TaskFilter({
  selectedType,
  selectedStatus,
  onTypeChange,
  onStatusChange,
  className,
}: TaskFilterProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Type Filter - Tab Style */}
      <div className="flex items-center gap-1 p-1 bg-background-tertiary rounded-lg">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = selectedType === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => onTypeChange(option.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={16} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Filter - Pill Style */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted uppercase tracking-wider mr-2">状态:</span>
        {STATUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = selectedStatus === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => onStatusChange(option.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                isActive
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-white/10 text-text-secondary hover:border-white/20 hover:text-white'
              )}
            >
              <Icon size={12} className={isActive ? 'text-primary' : option.color} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Compact Version for Mobile
// ============================================

interface TaskFilterCompactProps {
  selectedType: TaskTypeFilter;
  selectedStatus: TaskStatusFilter;
  onTypeChange: (type: TaskTypeFilter) => void;
  onStatusChange: (status: TaskStatusFilter) => void;
}

export function TaskFilterCompact({
  selectedType,
  selectedStatus,
  onTypeChange,
  onStatusChange,
}: TaskFilterCompactProps) {
  return (
    <div className="flex gap-2">
      {/* Type Select */}
      <select
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value as TaskTypeFilter)}
        className="flex-1 bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
      >
        {TYPE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Status Select */}
      <select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value as TaskStatusFilter)}
        className="flex-1 bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TaskFilter;
