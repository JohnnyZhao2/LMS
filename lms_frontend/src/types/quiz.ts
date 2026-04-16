/**
 * 试卷相关类型定义
 */

import type { SimpleTag } from './common';
import type { QuestionType } from './common';
/**
 * 试卷类型
 */
export type QuizType = 'PRACTICE' | 'EXAM';

interface QuizQuestionVersionInput {
  question_id: number;
  score: string | number;
}

/**
 * 试卷题目关联
 */
export interface QuizQuestion {
  id: number;
  question: number;
  question_content: string;
  question_type: QuestionType;
  question_type_display: string;
  order: number;
  score: string;
  resource_uuid: string;
  version_number: number;
  is_current: boolean;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  space_tag?: SimpleTag;
  tags?: SimpleTag[];
}

/**
 * 试卷列表项
 */
export interface QuizListItem {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  question_count: number;
  total_score: string;
  usage_count: number;
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: string | null;
  is_current: boolean;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 试卷详情
 */
export interface QuizDetail {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  questions: QuizQuestion[];
  question_count?: number;
  total_score: string;
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: number | null;
  is_current: boolean;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建试卷请求
 */
export interface QuizCreateRequest {
  title: string;
  quiz_type: QuizType;
  duration?: number | null;       // 考试类型必填
  pass_score?: number | null;     // 考试类型必填
  question_versions?: QuizQuestionVersionInput[];
}
