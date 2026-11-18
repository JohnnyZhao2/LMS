import type { EditableQuestionItem } from '@/lib/question-editor';

export interface QuizDraftState {
  quizId?: number;
  title: string;
  items: EditableQuestionItem[];
}
