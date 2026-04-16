/**
 * 题目相关类型定义
 */

import type { QuestionType, SimpleTag } from './common';

export interface Question {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  score?: string | number;
  space_tag?: SimpleTag;
  tags?: SimpleTag[];
  usage_count: number;
  is_referenced: boolean;
  is_objective?: boolean;
  is_subjective?: boolean;
  created_from_quiz_id?: number | null;
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionCreateRequest {
  content: string;
  question_type: QuestionType;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  space_tag_id?: number | null;
  tag_ids?: number[];
  score?: string | number;
}
