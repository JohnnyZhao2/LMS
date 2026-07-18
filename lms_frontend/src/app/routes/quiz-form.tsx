/**
 * 试卷表单路由：app 层注入 assessment tags 能力。
 */
import { assessmentTagDeps } from '@/app/tag-deps';
import { QuizForm } from '@/features/assessment/components/quizzes/quiz-form';

export const QuizFormRoutePage = () => <QuizForm tagDeps={assessmentTagDeps} />;
