/**
 * 任务分析相关类型定义
 */

import type { NodeExecutionStatus } from './common';

export type TaskNodeCategory = 'KNOWLEDGE' | 'PRACTICE' | 'EXAM';

export interface DistributionItem {
  range: string;
  count: number;
}

export interface TaskNodeProgress {
  node_id: number;
  node_name: string;
  category: TaskNodeCategory;
  completed_count: number;
  pending_count: number;
  overdue_count: number;
  total_count: number;
  percentage: number;
  average_time: number | null;
  average_score: number | null;
  duration: number | null;
  total_score: number | null;
  pass_score: number | null;
  pass_rate: number | null;
  passed_count: number | null;
  failed_count: number | null;
  abnormal_count: number;
  time_distribution: DistributionItem[];
  score_distribution: DistributionItem[] | null;
}

export interface TaskAnalytics {
  completion: {
    completed_count: number;
    in_progress_count: number;
    overdue_count: number;
    total_count: number;
    percentage: number;
  };
  average_time: number; // in minutes
  abnormal_count: number;
  node_progress: TaskNodeProgress[];
}

export interface StudentExecution {
  student_id: number;
  student_name: string;
  avatar_key: string;
  employee_id: string;
  department: string;
  status: NodeExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  time_spent: number | null;
  objective_score: number | null;
  subjective_score: number | null;
  score: number | null;
  is_passed: boolean | null;
  is_subjective_pending: boolean;
  attempt_count: number | null;
  is_abnormal: boolean;
}

type GradingQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface GradingQuestion {
  question_id: number;
  question_text: string;
  question_analysis: string;
  question_type: GradingQuestionType;
  question_type_display: string;
  max_score: number;
  pass_rate: number | null;
}

interface GradingOptionStudent {
  student_id: number;
  student_name: string;
  avatar_key: string;
  employee_id: string;
  department: string;
}

interface GradingOption {
  option_key: string;
  option_text: string;
  selected_count: number;
  is_correct: boolean;
  students: GradingOptionStudent[];
}

export interface GradingSubjectiveAnswer {
  answer_id: number;
  student_id: number;
  student_name: string;
  avatar_key: string;
  employee_id: string;
  department: string;
  answer_text: string | null;
  submitted_at: string;
  score: number | null;
}

export interface GradingAnswerResponse {
  question_id: number;
  question_type: GradingQuestionType;
  pass_rate: number | null;
  answered_count?: number;
  options?: GradingOption[];
  subjective_answers?: GradingSubjectiveAnswer[];
}

export interface GradingSubmitRequest {
  quiz_id: number;
  answer_id: number;
  score: number;
  comments: string;
}
