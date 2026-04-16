/**
 * 题目相关类型定义
 */

import type { QuestionType, SimpleTag } from './common';

/**
 * 题目
 */
export interface Question {
  id: number;
  resource_uuid: string;
  version_number: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  space_tag?: SimpleTag;
  tags?: SimpleTag[];
  usage_count: number;
  is_referenced: boolean;
  is_objective?: boolean;
  is_subjective?: boolean;
  is_current: boolean;
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建题目请求
 */
export interface QuestionCreateRequest {
  content: string;
  question_type: QuestionType;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  space_tag_id?: number | null;
  tag_ids?: number[];
  source_question_id?: number;
  sync_to_bank?: boolean;
}
