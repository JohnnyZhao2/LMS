/**
 * 试卷相关类型定义
 */

import type { QuestionType } from './common';
import type { QuestionCreateRequest } from './question';

/**
 * 试卷类型
 */
export type QuizType = 'PRACTICE' | 'EXAM';

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
}

/**
 * 试卷列表项
 */
export interface QuizListItem {
  id: number;
  title: string;
  description?: string;
  question_count: number;
  total_score: string;
  has_subjective_questions: boolean;
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: string | null;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 试卷详情
 */
export interface QuizDetail {
  id: number;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  question_count?: number;
  total_score: string;
  has_subjective_questions?: boolean;
  objective_question_count?: number;
  subjective_question_count?: number;
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: number | null;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建试卷请求
 */
export interface QuizCreateRequest {
  title: string;
  description?: string;
  quiz_type: QuizType;
  duration?: number;       // 考试类型必填
  pass_score?: number;     // 考试类型必填
  existing_question_ids?: number[];
  new_questions?: QuestionCreateRequest[];
}

/**
 * 添加题目到试卷请求
 */
export interface AddQuestionsToQuizRequest {
  question_ids: number[];
}
