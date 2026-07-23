/**
 * 任务表单路由：app 层组合 knowledge 预览 + quiz 预览 + 初始试卷详情。
 */
import { useSearchParams } from 'react-router-dom';

import { knowledgeTagDeps } from '@/app/tag-deps';
import { useQuizDetail } from '@/features/assessment/api/quizzes-queries';
import { QuizPreviewDialog } from '@/features/assessment/components/quizzes/quiz-preview-dialog';
import { KnowledgeDetailModal } from '@/features/knowledge/components/modals/knowledge-detail-modal';
import {
  TaskForm,
  type TaskKnowledgePreviewProps,
} from '@/features/tasks/components/task-form/task-form';

const KnowledgeDetailWithTags = (props: TaskKnowledgePreviewProps) => (
  <KnowledgeDetailModal {...props} tagDeps={knowledgeTagDeps} />
);

export const TaskFormRoutePage = () => {
  const [searchParams] = useSearchParams();
  const quizId = Number(searchParams.get('quiz_id') || 0);
  const { data: initialQuizDetail } = useQuizDetail(quizId);

  return (
    <TaskForm
      KnowledgePreview={KnowledgeDetailWithTags}
      QuizPreview={QuizPreviewDialog}
      initialQuizDetail={quizId > 0 ? initialQuizDetail : undefined}
    />
  );
};
