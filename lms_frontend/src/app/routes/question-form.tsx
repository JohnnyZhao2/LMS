/**
 * 题目编辑路由：app 层注入 assessment tags 能力。
 */
import { assessmentTagDeps } from '@/app/tag-deps';
import { QuestionFormPage } from '@/features/assessment/components/questions/question-form-page';

export const QuestionFormRoutePage = () => (
  <QuestionFormPage tagDeps={assessmentTagDeps} />
);
