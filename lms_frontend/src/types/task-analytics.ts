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
  employee_id: string;
  department: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED_ABNORMAL';
  node_progress: string;
  score: number | null;
  time_spent: number;
  answer_details: string;
  is_abnormal: boolean;
}

export interface StudentExecutionsResponse {
  results: StudentExecution[];
  count: number;
}

export interface GradingQuestion {
  question_id: number;
  question_text: string;
  question_analysis: string;
  max_score: number;
  ungraded_count: number;
}

export interface GradingAnswer {
  student_id: number;
  student_name: string;
  employee_id: string;
  department: string;
  answer_text: string;
  submitted_at: string;
  score: number | null;
  comments: string | null;
  is_graded: boolean;
}

export interface GradingSubmitRequest {
  question_id: number;
  student_id: number;
  score: number;
  comments: string;
}
