/**
 * 答题相关类型定义
 */

import type { QuestionType, SubmissionStatus } from './common';
import type { QuizType } from './quiz';

/**
 * 答案
 */
export interface Answer {
  id: number;
  question: number;
  question_content: string;
  question_type: QuestionType;
  question_type_display?: string;
  question_options?: Record<string, string> | Array<{ key?: string; value?: string }>;
  question_score?: string;
  score?: string;
  user_answer?: Record<string, unknown>;
  correct_answer?: Record<string, unknown>;
  is_correct?: boolean;
  obtained_score?: string;
  explanation?: string;
  graded_by?: number;
  graded_by_name?: string;
  graded_at?: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 保存答案请求
 */
export interface SaveAnswerRequest {
  question_id: number;
  user_answer?: unknown;
}

/**
 * 提交详情
 */
export interface SubmissionDetail {
  id: number;
  quiz: number;
  quiz_title: string;
  quiz_type: QuizType;
  quiz_type_display: string;
  quiz_duration?: number | null;
  user: number;
  user_name: string;
  task_title: string;
  attempt_number: number;
  status: SubmissionStatus;
  status_display: string;
  total_score: string;
  obtained_score?: string;
  pass_score: string;
  is_passed: boolean;
  started_at: string;
  submitted_at?: string;
  remaining_seconds?: number;
  answers: Answer[];
  created_at: string;
  updated_at: string;
}

/**
 * 练习结果
 */
export interface PracticeResult {
  id: number;
  quiz: number;
  quiz_title: string;
  attempt_number: number;
  status: SubmissionStatus;
  status_display: string;
  total_score: string;
  obtained_score?: string;
  started_at: string;
  submitted_at?: string;
  answers: Answer[];
  created_at: string;
}
