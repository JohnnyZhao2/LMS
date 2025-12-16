/**
 * LearningTaskPage
 * Page wrapper for learning task detail view
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { LearningTaskDetail } from './components/LearningTaskDetail';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import type { TaskAssignmentDetail } from './api/tasks';
import type { TaskType, TaskAssignmentStatus, UserBasic, Knowledge, KnowledgeLearningProgress } from '@/types/domain';

// ============================================
// Mock Data (to be replaced with API)
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
  {
    id: 103,
    title: '核心交换机冗余检查',
    summary: '如何验证 Core-A/B 交换机的主备状态',
    knowledge_type: 'EMERGENCY',
    primary_category: { id: 3, name: '网络', level: 1 },
    operation_tags: ['检查', '维护'],
    created_by: MOCK_USER,
    updated_at: '2025-12-10T10:00:00Z',
    view_count: 234,
  },
];

const MOCK_ASSIGNMENT: TaskAssignmentDetail = {
  id: 1,
  task: {
    id: 1,
    title: '数据库故障应急协议学习',
    description: '学习 Oracle 数据库节点的核心恢复步骤，理解主备切换流程。本任务包含三篇知识文档，请认真学习并确认掌握。',
    type: 'LEARNING' as TaskType,
    status: 'ACTIVE',
    deadline: '2025-12-20T23:59:59Z',
    created_by: MOCK_USER,
    knowledge_items: MOCK_KNOWLEDGE,
  },
  user: { id: 2, username: 'student1', real_name: '学员一', employee_id: 'STU001' },
  status: 'IN_PROGRESS' as TaskAssignmentStatus,
  progress: 33,
  knowledge_progress: MOCK_KNOWLEDGE.map((k, index) => ({
    id: index + 1,
    knowledge: k,
    is_completed: index === 0, // First one completed
    completed_at: index === 0 ? '2025-12-16T10:30:00Z' : undefined,
  })) as KnowledgeLearningProgress[],
};

// ============================================
// Component
// ============================================

export function LearningTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // In real implementation, use useTaskAssignmentDetail hook
  const assignment = useMemo(() => MOCK_ASSIGNMENT, []);
  const isLoading = false;
  const error = null;

  // Handle complete knowledge
  const handleCompleteKnowledge = async (knowledgeId: number) => {
    // In real implementation, call useCompleteKnowledgeLearning mutation
    console.log('Completing knowledge:', knowledgeId, 'for task:', taskId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    <LearningTaskDetail
      assignment={assignment}
      onCompleteKnowledge={handleCompleteKnowledge}
    />
  );
}

export default LearningTaskPage;
