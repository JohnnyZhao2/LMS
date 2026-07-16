import type { EditableQuestionItem } from '@/components/questions/question-editor-helpers';

export type InlineQuestionItem = EditableQuestionItem;

export interface QuizDraftState {
  quizId?: number;
  title: string;
  quizType: 'PRACTICE' | 'EXAM';
  duration?: number;
  passScore?: number;
  items: InlineQuestionItem[];
}
