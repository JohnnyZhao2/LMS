import type { EditableQuestionItem } from '@/features/questions/components/question-editor-helpers';

export type InlineQuestionItem = EditableQuestionItem;

export interface QuizDraftState {
  quizId?: number;
  title: string;
  quizType: 'PRACTICE' | 'EXAM';
  duration?: number;
  passScore?: number;
  items: InlineQuestionItem[];
}
