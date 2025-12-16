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
import type { TaskAssignmentDetail } from './api/tasks';
import type { TaskType, TaskAssignmentStatus, UserBasic, Knowledge, Quiz, QuizProgress } from '@/types/domain';

// ============================================
// Mock Data (to be replaced with API)
// ============================================

const MOCK_USER: UserBasic = {
  id: 1,
  username: 'mentor_zhang',
  real_name: '张导师',
  employee_id: 'EMP001',
};

const MOCK_KNOWLEDGE: Knowledge = {
  id: 101,
  title: 'Kubernetes Pod CrashLoopBackOff 诊断',
  summary: '容器故障诊断标准操作流程',
  knowledge_type: 'EMERGENCY',
  primary_category: { id: 1, name: '云计算', level: 1 },
  operation_tags: ['调试', '日志分析'],
  created_by: MOCK_USER,
  updated_at: '2025-12-15T10:00:00Z',
  view_count: 156,
};

const MOCK_QUIZ: Quiz = {
  id: 1,
  title: '网络隔离标准流程测试',
  description: '交换机故障隔离协议演练',
  questions: [
    {
      question: {
        id: 1,
        type: 'SINGLE_CHOICE',
        content: '检测到核心交换机心跳故障时，首要操作是什么？',
        options: [
          { key: 'A', content: '立即重启交换机' },
          { key: 'B', content: '通过备用交换机验证对等链路状态' },
          { key: 'C', content: '断开所有光纤电缆' },
          { key: 'D', content: '清除 ARP 表' },
        ],
        answer: 'B',
        explanation: '在采取破坏性操作之前，始终先验证状态。',
        created_by: MOCK_USER,
      },
      order: 1,
      score: 10,
    },
    {
      question: {
        id: 2,
        type: 'MULTIPLE_CHOICE',
        content: '哪些命令可以验证 OSPF 邻居邻接关系？',
        options: [
          { key: 'A', content: 'show ip ospf neighbor' },
          { key: 'B', content: 'show ip route ospf' },
          { key: 'C', content: 'display ospf peer' },
          { key: 'D', content: 'ping 127.0.0.1' },
        ],
        answer: ['A', 'C'],
        explanation: '在我们的混合环境中，Cisco (show) 和华为 (display) 命令都有效。',
        created_by: MOCK_USER,
      },
      order: 2,
      score: 10,
    },
  ],
  total_score: 20,
  created_by: MOCK_USER,
};

const MOCK_QUIZ_2: Quiz = {
  id: 2,
  title: '数据库备份恢复测试',
  description: 'Oracle 数据库备份与恢复流程测试',
  questions: [],
  total_score: 30,
  created_by: MOCK_USER,
};

const MOCK_ASSIGNMENT: TaskAssignmentDetail = {
  id: 2,
  task: {
    id: 2,
    title: '网络隔离演练 - Q4',
    description: '在模拟环境中练习隔离程序，确保无用户流量泄漏。本任务包含两份试卷，可多次练习。',
    type: 'PRACTICE' as TaskType,
    status: 'ACTIVE',
    deadline: '2025-12-18T23:59:59Z',
    created_by: MOCK_USER,
    quizzes: [MOCK_QUIZ, MOCK_QUIZ_2],
    knowledge_items: [MOCK_KNOWLEDGE],
  },
  user: { id: 2, username: 'student1', real_name: '学员一', employee_id: 'STU001' },
  status: 'IN_PROGRESS' as TaskAssignmentStatus,
  progress: 45,
  quiz_progress: [
    {
      quiz: MOCK_QUIZ,
      attempt_count: 2,
      latest_score: 15,
      best_score: 18,
      last_attempt_at: '2025-12-16T14:30:00Z',
    },
    {
      quiz: MOCK_QUIZ_2,
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

export function PracticeTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // In real implementation, use useTaskAssignmentDetail hook
  const assignment = useMemo(() => MOCK_ASSIGNMENT, []);
  const isLoading = false;
  const error = null;

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
    <PracticeTaskDetail
      assignment={assignment}
      onStartQuiz={handleStartQuiz}
    />
  );
}

export default PracticeTaskPage;
