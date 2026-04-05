import type { EditableQuestionItem } from '@/features/questions/components/question-editor-helpers';
import type { QuestionType } from '@/types/api';

export interface QuizQuestionItem {
  id: number;
  resource_uuid: string;
  is_current: boolean;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  score: string;
  order: number;
}

export type InlineQuestionItem = EditableQuestionItem;

export interface QuizDraftState {
  quizId?: number;
  title: string;
  quizType: 'PRACTICE' | 'EXAM';
  duration?: number;
  passScore?: number;
  items: InlineQuestionItem[];
}
