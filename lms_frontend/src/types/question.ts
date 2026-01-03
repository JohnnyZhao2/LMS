/**
 * 题目相关类型定义
 */

import type { QuestionType, Difficulty, SimpleTag } from './common';

/**
 * 题目
 */
export interface Question {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  score: string;
  difficulty?: Difficulty;
  difficulty_display?: string;
  line_type?: SimpleTag;
  is_objective?: boolean;
  is_subjective?: boolean;
  created_by?: number;
  created_by_name?: string;
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
  score?: string | number;
  difficulty?: Difficulty;
  line_type_id?: number;
}
