/**
 * LearningTaskPage
 * Page wrapper for learning task detail view
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { LearningTaskDetail } from './components/LearningTaskDetail';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTaskAssignmentDetail, useCompleteKnowledgeLearning } from './api/tasks';
import type { TaskAssignmentDetail } from './api/tasks';
import type { TaskType, TaskAssignmentStatus, Knowledge, KnowledgeLearningProgress, KnowledgeType } from '@/types/domain';

// ============================================
// Helper: Transform API response to TaskAssignmentDetail format
// ============================================

interface LearningTaskApiResponse {
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
  knowledge_items?: Array<{
    id: number;
    title: string;
    summary?: string;
    knowledge_type: string;
    primary_category?: { id: number; name: string; level: number };
    is_completed: boolean;
    completed_at?: string;
  }>;
}

function transformApiToAssignment(data: LearningTaskApiResponse): TaskAssignmentDetail {
  const knowledgeItems: Knowledge[] = (data.knowledge_items || []).map(item => ({
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    knowledge_type: item.knowledge_type as KnowledgeType,
    primary_category: item.primary_category 
      ? { ...item.primary_category, level: item.primary_category.level as 1 | 2 }
      : { id: 0, name: '', level: 1 as const },
    operation_tags: [],
    created_by: { id: 0, username: '', real_name: data.created_by_name, employee_id: '' },
    updated_at: '',
    view_count: 0,
  }));

  const knowledgeProgress: KnowledgeLearningProgress[] = (data.knowledge_items || []).map((item, index) => ({
    id: index + 1,
    knowledge: knowledgeItems[index],
    is_completed: item.is_completed,
    completed_at: item.completed_at,
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
      knowledge_items: knowledgeItems,
    },
    user: { id: 0, username: '', real_name: '', employee_id: '' },
    status: data.status,
    progress: parseFloat(data.progress) || 0,
    completed_at: data.completed_at,
    knowledge_progress: knowledgeProgress,
  };
}

// ============================================
// Component
// ============================================

export function LearningTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();

  // Fetch task assignment detail from API
  const { data, isLoading, error, refetch } = useTaskAssignmentDetail(taskId);
  
  // Complete knowledge mutation
  const completeKnowledgeMutation = useCompleteKnowledgeLearning();

  // Transform API response
  const assignment = useMemo(() => {
    if (!data) return null;
    return transformApiToAssignment(data as unknown as LearningTaskApiResponse);
  }, [data]);

  // Handle complete knowledge
  const handleCompleteKnowledge = async (knowledgeId: number) => {
    if (!taskId) return;
    await completeKnowledgeMutation.mutateAsync({
      assignmentId: taskId,
      knowledgeId,
    });
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
    <LearningTaskDetail
      assignment={assignment}
      onCompleteKnowledge={handleCompleteKnowledge}
    />
  );
}

export default LearningTaskPage;
