/**
 * Personal Center API Types
 * Type definitions for personal center API
 * @module features/analytics/api/types
 */

import type { UserBasic, Question, Quiz, Task } from '@/types/domain';

/**
 * Personal profile information
 * Requirements: 10.1 - Display name, team, mentor info
 */
export interface PersonalProfile {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  department: {
    id: number;
    name: string;
  };
  mentor?: UserBasic;
  created_at: string;
}

/**
 * Score record for practice or exam
 * Requirements: 10.2 - Display practice and exam score records
 */
export interface ScoreRecord {
  id: number;
  task: Pick<Task, 'id' | 'title' | 'type'>;
  quiz: Pick<Quiz, 'id' | 'title' | 'total_score'>;
  attempt_number: number;
  obtained_score: number;
  total_score: number;
  submitted_at: string;
  is_passed?: boolean;
}

/**
 * Score history response
 */
export interface ScoreHistoryResponse {
  records: ScoreRecord[];
  total: number;
  average_score: number;
  pass_rate: number;
}

/**
 * Wrong answer record
 * Requirements: 10.3 - Display wrong answers from practice and exams
 */
export interface WrongAnswerRecord {
  id: number;
  question: Question;
  user_answer: string | string[];
  correct_answer: string | string[];
  task_title: string;
  quiz_title: string;
  submitted_at: string;
}

/**
 * Wrong answers response
 */
export interface WrongAnswersResponse {
  wrong_answers: WrongAnswerRecord[];
  total: number;
}

/**
 * Personal center data (combined response)
 */
export interface PersonalCenterData {
  profile: PersonalProfile;
  score_summary: {
    total_submissions: number;
    average_score: number;
    pass_rate: number;
    best_score: number;
  };
  recent_scores: ScoreRecord[];
  wrong_answer_count: number;
}

/**
 * Score history params for filtering
 */
export interface ScoreHistoryParams {
  page?: number;
  page_size?: number;
  type?: 'PRACTICE' | 'EXAM';
}

/**
 * Wrong answers params for filtering
 */
export interface WrongAnswersParams {
  page?: number;
  page_size?: number;
  question_type?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
}
