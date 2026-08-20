import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { KnowledgeCenter } from '@/features/knowledge/components/knowledge-center';
import { useWorkbench } from '@/hooks/use-workbench';
import { showApiError } from '@/utils/error-handler';

export const KnowledgeCenterPage = () => {
  const workbench = useWorkbench();
  const [searchParams] = useSearchParams();
  const taskId = Number(searchParams.get('task') || 0);
  const taskKnowledgeId = Number(searchParams.get('taskKnowledgeId') || 0);
  const enabled = workbench === 'learn' && taskId > 0 && taskKnowledgeId > 0;
  const { data: learningDetail } = useStudentLearningTaskDetail(taskId, { enabled });
  const completeLearning = useCompleteLearning();
  const taskKnowledgeItem = learningDetail?.knowledge_items.find((item) => item.id === taskKnowledgeId);

  const learning = enabled
    ? {
        isCompleted: Boolean(taskKnowledgeItem?.is_completed),
        isMarking: completeLearning.isPending,
        onMarkLearned: async () => {
          try {
            await completeLearning.mutateAsync({ taskId, taskKnowledgeId });
            toast.success('已标记为完成');
          } catch (error) {
            showApiError(error, '操作失败，请稍后重试');
            throw error;
          }
        },
      }
    : undefined;

  return <KnowledgeCenter learning={learning} />;
};
