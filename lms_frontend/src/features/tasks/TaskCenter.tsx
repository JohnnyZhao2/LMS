/**
 * TaskCenter Page
 * Main task center page combining task list and routing to detail views
 * Requirements: 6.1, 6.5 - 展示任务列表，根据任务类型跳转到对应详情页
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList } from './components/TaskList';
import { CheckSquare } from 'lucide-react';
import type { TaskAssignment, TaskType, TaskAssignmentStatus, UserBasic, Knowledge, Quiz } from '@/types/domain';

// ============================================
// Mock Data (to be replaced with API calls)
// ============================================

const MOCK_USER: UserBasic = {
  id: 1,
  username: 'mentor_zhang',
  real_name: '张导师',
  employee_id: 'EMP001',
};

const MOCK_KNOWLEDGE: Knowledge[] = [
  {
    id: 101,
    title: 'Kubernetes Pod CrashLoopBackOff 诊断',
    summary: '容器故障诊断标准操作流程',
    knowledge_type: 'EMERGENCY',
    primary_category: { id: 1, name: '云计算', level: 1 },
    operation_tags: ['调试', '日志分析'],
    created_by: MOCK_USER,
    updated_at: '2025-12-15T10:00:00Z',
    view_count: 156,
  },
  {
    id: 102,
    title: 'Redis 缓存淘汰策略',
    summary: '理解缓存层中的 LRU 与 LFU',
    knowledge_type: 'OTHER',
    primary_category: { id: 2, name: '数据库', level: 1 },
    operation_tags: ['性能优化'],
    created_by: MOCK_USER,
    updated_at: '2025-12-14T10:00:00Z',
    view_count: 89,
  },
];

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
  ],
  total_score: 100,
  created_by: MOCK_USER,
};

// Convert old mock format to new format
const MOCK_ASSIGNMENTS: TaskAssignment[] = [
  {
    id: 1,
    task: {
      id: 1,
      title: '数据库故障应急协议学习',
      description: '学习 Oracle 数据库节点的核心恢复步骤，理解主备切换流程。',
      type: 'LEARNING' as TaskType,
      status: 'ACTIVE',
      deadline: '2025-12-20T23:59:59Z',
      created_by: MOCK_USER,
      knowledge_items: MOCK_KNOWLEDGE,
    },
    user: { id: 2, username: 'student1', real_name: '学员一', employee_id: 'STU001' },
    status: 'IN_PROGRESS' as TaskAssignmentStatus,
    progress: 33,
  },
  {
    id: 2,
    task: {
      id: 2,
      title: '网络隔离演练 - Q4',
      description: '在模拟环境中练习隔离程序，确保无用户流量泄漏。',
      type: 'PRACTICE' as TaskType,
      status: 'ACTIVE',
      deadline: '2025-12-18T23:59:59Z',
      created_by: MOCK_USER,
      quizzes: [MOCK_QUIZ],
      knowledge_items: [MOCK_KNOWLEDGE[0]],
    },
    user: { id: 2, username: 'student1', real_name: '学员一', employee_id: 'STU001' },
    status: 'IN_PROGRESS' as TaskAssignmentStatus,
    progress: 45,
  },
  {
    id: 3,
    task: {
      id: 3,
      title: '年终能力评估',
      description: '涵盖云计算、网络和数据库模块的期末考试，时长 60 分钟。',
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
  },
  {
    id: 4,
    task: {
      id: 4,
      title: 'DevOps CI/CD 流水线基础',
      description: '复习更新后的 Jenkins 流水线配置标准。',
      type: 'LEARNING' as TaskType,
      status: 'ACTIVE',
      deadline: '2025-12-10T23:59:59Z',
      created_by: MOCK_USER,
      knowledge_items: [MOCK_KNOWLEDGE[1]],
    },
    user: { id: 2, username: 'student1', real_name: '学员一', employee_id: 'STU001' },
    status: 'COMPLETED' as TaskAssignmentStatus,
    progress: 100,
    completed_at: '2025-12-09T15:30:00Z',
  },
];

// ============================================
// Component
// ============================================

export function TaskCenter() {
  const navigate = useNavigate();

  // In real implementation, this would use useTaskAssignments hook
  const assignments = useMemo(() => MOCK_ASSIGNMENTS, []);
  const isLoading = false;
  const error = null;

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
        error={error}
        onTaskClick={handleTaskClick}
      />
    </div>
  );
}

export default TaskCenter;
