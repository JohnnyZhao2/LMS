/**
 * 试卷相关类型定义
 */

import type { SimpleTag } from './common';
import type { QuestionType } from './common';

export type QuizType = 'PRACTICE' | 'EXAM';

export interface QuizQuestionInput {
  id?: number;
  source_question_id?: number | null;
  content: string;
  question_type: QuestionType;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  score: string | number;
  space_tag_id?: number | null;
  tag_ids?: number[];
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
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: string | null;
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
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: number | null;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizCreateRequest {
  title: string;
  quiz_type: QuizType;
  duration?: number | null;
  pass_score?: number | null;
  questions?: QuizQuestionInput[];
}
