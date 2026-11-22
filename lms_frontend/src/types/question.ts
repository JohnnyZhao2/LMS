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
  space_tag?: SimpleTag;
  tags?: SimpleTag[];
  usage_count: number;
  created_by_name?: string;
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
}
