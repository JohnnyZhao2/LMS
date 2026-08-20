import type { EditableQuestionItem } from '@/lib/question-editor';

export interface QuizDraftState {
  quizId?: number;
  title: string;
  quizType: 'PRACTICE' | 'EXAM';
  duration?: number;
  passScore?: number;
  items: EditableQuestionItem[];
}
