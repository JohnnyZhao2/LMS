/**
 * 任务分析相关类型定义
 */

export interface TaskAnalytics {
  completion: {
    completed_count: number;
    total_count: number;
    percentage: number;
  };
  average_time: number; // in minutes
  accuracy: {
    has_quiz: boolean;
    percentage: number | null;
  };
  abnormal_count: number;
  node_progress: TaskNodeProgress[];
  time_distribution: DistributionItem[];
  score_distribution: DistributionItem[] | null;
  pass_rate: number | null;
}

export interface TaskNodeProgress {
  node_id: number;
  node_name: string;
  category: 'KNOWLEDGE' | 'PRACTICE' | 'EXAM';
  completed_count: number;
  total_count: number;
  percentage: number;
}

export interface DistributionItem {
  range: string;
  count: number;
}

export interface StudentExecution {
  student_id: number;
  student_name: string;
  avatar_key: string;
  employee_id: string;
  department: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED_ABNORMAL';
  node_progress: string;
  score: number | null;
  time_spent: number;
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
  options?: GradingOption[];
  subjective_answers?: GradingSubjectiveAnswer[];
}

export interface GradingSubmitRequest {
  quiz_id: number;
  question_id: number;
  student_id: number;
  score: number;
  comments: string;
}
