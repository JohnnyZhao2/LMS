/**
 * 题目管理路由：app 层注入 assessment tags 能力。
 */
import { assessmentTagDeps } from '@/app/tag-deps';
import { QuestionManagementPage } from '@/features/assessment/questions/components/question-management-page';

export const QuestionManagementRoutePage = () => (
  <QuestionManagementPage tagDeps={assessmentTagDeps} />
);
