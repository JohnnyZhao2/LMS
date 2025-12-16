/**
 * ExamTaskPage
 * Page wrapper for exam task detail view
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { ExamTaskDetail } from './components/ExamTaskDetail';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import type { TaskAssignmentDetail } from './api/tasks';
import type { TaskType, TaskAssignmentStatus, UserBasic, Quiz, QuizProgress } from '@/types/domain';

// ============================================
// Mock Data (to be replaced with API)
// ============================================

const MOCK_USER: UserBasic = {
  id: 1,
  username: 'admin',
  real_name: '管理员',
  employee_id: 'ADM001',
};

const MOCK_QUIZ: Quiz = {
  id: 3,
  title: '年终能力评估试卷',
  description: '涵盖云计算、网络和数据库模块的综合评估',
  questions: Array.from({ length: 20 }, (_, i) => ({
    question: {
      id: i + 1,
      type: 'SINGLE_CHOICE' as const,
      content: `题目 ${i + 1}`,
      options: [
        { key: 'A', content: '选项 A' },
        { key: 'B', content: '选项 B' },
        { key: 'C', content: '选项 C' },
        { key: 'D', content: '选项 D' },
      ],
      answer: 'A',
      explanation: '解析内容',
      created_by: MOCK_USER,
    },
    order: i + 1,
    score: 5,
  })),
  total_score: 100,
  created_by: MOCK_USER,
};

const MOCK_ASSIGNMENT: TaskAssignmentDetail = {
  id: 3,
  task: {
    id: 3,
    title: '年终能力评估',
    description: '涵盖云计算、网络和数据库模块的期末考试。请在规定时间内完成，考试期间不可暂停。',
    type: 'EXAM' as TaskType,
    status: 'ACTIVE',
    deadline: '2025-12-30T18:00:00Z',
    start_time: '2025-12-30T09:00:00Z',
    duration: 60,
    pass_score: 60,
    created_by: MOCK_USER,
    quizzes: [MOCK_QUIZ],
  },
  user: { id: 2, username: 'student1', real_name: '学员一', employee_id: 'STU001' },
  status: 'PENDING_EXAM' as TaskAssignmentStatus,
  progress: 0,
  quiz_progress: [
    {
      quiz: MOCK_QUIZ,
      attempt_count: 0,
      latest_score: undefined,
      best_score: undefined,
      last_attempt_at: undefined,
    },
  ] as QuizProgress[],
};

// ============================================
// Component
// ============================================

export function ExamTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // In real implementation, use useTaskAssignmentDetail hook
  const assignment = useMemo(() => MOCK_ASSIGNMENT, []);
  const isLoading = false;
  const error = null;

  // Handle start exam
  const handleStartExam = () => {
    navigate(`/tasks/exam/${taskId}/start`);
  };

  // Handle view result
  const handleViewResult = () => {
    navigate(`/tasks/exam/${taskId}/result`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="加载失败"
        message="无法加载任务详情"
        onRetry={() => navigate(0)}
      />
    );
  }

  return (
    <ExamTaskDetail
      assignment={assignment}
      onStartExam={handleStartExam}
      onViewResult={handleViewResult}
    />
  );
}

export default ExamTaskPage;
