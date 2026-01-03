/**
 * 评分相关类型定义
 */

import type { Answer } from './submission';

/**
 * 评分详情
 */
export interface GradingDetail {
  id: number;
  submission: number;
  quiz_title: string;
  user_name: string;
  task_title: string;
  total_score: string;
  obtained_score?: string;
  answers: Answer[];
  created_at: string;
  updated_at: string;
}

/**
 * 评分列表项
 */
export interface GradingList {
  id: number;
  submission: number;
  quiz_title: string;
  user_name: string;
  task_title: string;
  submitted_at?: string;
}

/**
 * 提交评分请求
 */
export interface GradeAnswerRequest {
  answer_id: number;
  obtained_score: string;
  comment?: string;
}
