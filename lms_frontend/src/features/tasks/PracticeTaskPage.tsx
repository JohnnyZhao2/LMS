/**
 * PracticeTaskPage
 * Page wrapper for practice task detail view
 * Requirements: 8.1, 8.2, 8.3
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { PracticeTaskDetail } from './components/PracticeTaskDetail';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTaskAssignmentDetail } from './api/get-task-assignment-detail';
import type { TaskAssignmentDetail } from './api/types';
import type { TaskType, TaskAssignmentStatus, Quiz, QuizProgress } from '@/types/domain';

// ============================================
// Helper: Transform API response to TaskAssignmentDetail format
// ============================================

interface PracticeTaskApiResponse {
  id: number;
  task_id: number;
  task_title: string;
  task_description: string;
  task_type: string;
  deadline: string;
  created_by_name: string;
  status: TaskAssignmentStatus;
  progress: string;
  completed_at?: string;
  quizzes?: Array<{
    id: number;
    title: string;
    description?: string;
    total_score: number;
    question_count: number;
    attempt_count: number;
    latest_score?: number;
    best_score?: number;
    last_attempt_at?: string;
  }>;
}

function transformApiToAssignment(data: PracticeTaskApiResponse): TaskAssignmentDetail {
  const quizzes: Quiz[] = (data.quizzes || []).map(q => ({
    id: q.id,
    title: q.title,
    description: q.description || '',
    questions: [],
    total_score: q.total_score,
    created_by: { id: 0, username: '', real_name: data.created_by_name, employee_id: '' },
  }));

  const quizProgress: QuizProgress[] = (data.quizzes || []).map((q, index) => ({
    quiz: quizzes[index],
    attempt_count: q.attempt_count,
    latest_score: q.latest_score,
    best_score: q.best_score,
    last_attempt_at: q.last_attempt_at,
  }));

  return {
    id: data.id,
    task: {
      id: data.task_id,
      title: data.task_title,
      description: data.task_description,
      type: data.task_type as TaskType,
      status: 'ACTIVE',
      deadline: data.deadline,
      created_by: { id: 0, username: '', real_name: data.created_by_name, employee_id: '' },
      quizzes,
    },
    user: { id: 0, username: '', real_name: '', employee_id: '' },
    status: data.status,
    progress: parseFloat(data.progress) || 0,
    completed_at: data.completed_at,
    quiz_progress: quizProgress,
  };
}

// ============================================
// Component
// ============================================

export function PracticeTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // Fetch task assignment detail from API
  const { data, isLoading, error, refetch } = useTaskAssignmentDetail(taskId);

  // Transform API response
  const assignment = useMemo(() => {
    if (!data) return null;
    return transformApiToAssignment(data as unknown as PracticeTaskApiResponse);
  }, [data]);

  // Handle start quiz
  const handleStartQuiz = (quizId: number) => {
    navigate(`/tasks/practice/${taskId}/quiz/${quizId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <ErrorState
        title="加载失败"
        message="无法加载任务详情"
        onRetry={refetch}
      />
    );
  }

  return (
    <PracticeTaskDetail
      assignment={assignment}
      onStartQuiz={handleStartQuiz}
    />
  );
}

export default PracticeTaskPage;
