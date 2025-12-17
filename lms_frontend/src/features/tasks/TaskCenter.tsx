/**
 * TaskCenter Page
 * Main task center page combining task list and routing to detail views
 * Requirements: 6.1, 6.5 - 展示任务列表，根据任务类型跳转到对应详情页
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList } from './components/TaskList';
import { CheckSquare } from 'lucide-react';
import { useTaskAssignments } from './api/get-task-assignments';
import type { TaskAssignment, TaskType, TaskAssignmentStatus } from '@/types/domain';

// ============================================
// Helper: Transform API response to TaskAssignment format
// ============================================

interface TaskCenterApiItem {
  id: number;
  task_id: number;
  task_title: string;
  task_description: string;
  task_type: string;
  task_type_display: string;
  deadline: string;
  start_time?: string;
  duration?: number;
  pass_score?: string;
  created_by_name: string;
  status: TaskAssignmentStatus;
  status_display: string;
  progress: string;
  score?: string;
  completed_at?: string;
  created_at: string;
}

function transformApiToAssignment(item: TaskCenterApiItem): TaskAssignment {
  return {
    id: item.id,
    task: {
      id: item.task_id,
      title: item.task_title,
      description: item.task_description,
      type: item.task_type as TaskType,
      status: 'ACTIVE',
      deadline: item.deadline,
      start_time: item.start_time,
      duration: item.duration,
      pass_score: item.pass_score ? parseFloat(item.pass_score) : undefined,
      created_by: {
        id: 0,
        username: '',
        real_name: item.created_by_name,
        employee_id: '',
      },
    },
    user: {
      id: 0,
      username: '',
      real_name: '',
      employee_id: '',
    },
    status: item.status,
    progress: parseFloat(item.progress) || 0,
    completed_at: item.completed_at,
  };
}

// ============================================
// Component
// ============================================

export function TaskCenter() {
  const navigate = useNavigate();

  // Fetch task assignments from API
  const { data, isLoading, error, refetch } = useTaskAssignments();

  // Transform API response to TaskAssignment format
  const assignments = useMemo(() => {
    if (!data?.results) return [];
    return (data.results as unknown as TaskCenterApiItem[]).map(transformApiToAssignment);
  }, [data]);

  // Handle task click - Requirements: 6.5
  const handleTaskClick = (assignment: TaskAssignment) => {
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
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
            <CheckSquare className="text-accent" /> 任务中心
          </h1>
          <p className="text-text-muted mt-1">
            执行分配的学习、练习和考试任务
          </p>
        </div>
      </div>

      {/* Task List */}
      <TaskList
        assignments={assignments}
        isLoading={isLoading}
        error={error instanceof Error ? error : null}
        onRetry={refetch}
        onTaskClick={handleTaskClick}
      />
    </div>
  );
}

export default TaskCenter;
