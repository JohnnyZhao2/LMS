/**
 * 试卷相关类型定义
 */

import type { SimpleTag } from './common';
import type { QuestionType } from './common';

export interface QuizQuestionInput {
  id?: number;
  source_question_id?: number | null;
  content?: string;
  question_type?: QuestionType;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  score: string | number;
  space_tag_id?: number | null;
  tag_ids?: number[];
  question_changes?: Partial<Omit<QuizQuestionInput, 'id' | 'source_question_id' | 'question_changes'>>;
}

export interface QuizQuestion {
  id: number;
  source_question_id?: number | null;
  question_content: string;
  question_type: QuestionType;
  question_type_display: string;
  order: number;
  score: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  space_tag?: SimpleTag;
  tags?: SimpleTag[];
}

export interface QuizListItem {
  id: number;
  title: string;
  question_count: number;
  total_score: string;
  usage_count: number;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizDetail {
  id: number;
  title: string;
  questions: QuizQuestion[];
  question_count?: number;
  total_score: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizCreateRequest {
  title: string;
  questions?: QuizQuestionInput[];
}
