/**
 * 仪表盘相关类型定义
 */

import type { LatestKnowledge } from './knowledge';

/**
 * 学员预警类型
 */
export type AlertType = 'overdue' | 'failed_exam' | 'inactive' | 'slow_progress' | 'score_decline';
export type AlertLevel = 'high' | 'medium' | 'low';

/**
 * 学员预警信息
 */
export interface StudentAlert {
  type: AlertType;
  level: AlertLevel;
  message: string;
  count?: number;
  tasks?: { task_id: number; task_title: string }[];
  score?: number;
  quiz_title?: string;
}

/**
 * 需要关注的学员
 */
export interface StudentNeedingAttention {
  student_id: number;
  student_name: string;
  employee_id: string;
  department_name: string | null;
  alerts: StudentAlert[];
  alert_count: number;
  highest_level: AlertLevel;
}

/**
 * 需要关注的学员响应
 */
export interface StudentsNeedingAttentionResponse {
  total_count: number;
  students: StudentNeedingAttention[];
}

/**
 * 学员统计数据
 */
export interface StudentStats {
  in_progress_count: number;
  urgent_count: number;
  completion_rate: number;
  exam_avg_score: number | null;
  total_tasks: number;
  completed_count: number;
  overdue_count: number;
}

/**
 * 任务参与者进度
 */
export interface TaskParticipant {
  id: number;
  name: string;
  progress: number;
  rank: number;
  is_me: boolean;
}

/**
 * 学员仪表盘任务
 */
export interface StudentDashboardTask {
  id: number;
  task_id: number;
  task_title: string;
  deadline: string;
  created_by_name: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  status_display: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    knowledge_total?: number;
    knowledge_completed?: number;
    quiz_total?: number;
    quiz_completed?: number;
  };
  score?: string | null;
  completed_at?: string | null;
  created_at: string;
}

/**
 * 学员仪表盘
 */
export interface StudentDashboard {
  stats: StudentStats;
  tasks: StudentDashboardTask[];
  latest_knowledge: LatestKnowledge[];
}

/**
 * 导师仪表盘
 */
export interface MentorDashboard {
  summary: MentorDashboardSummary;
  students: Record<string, unknown>[];
  quick_links: Record<string, string>;
  current_role: string;
}

export interface MentorDashboardSummary {
  total_students: number;
  weekly_active_users: number;
  monthly_tasks: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  overall_completion_rate: number;
  overall_avg_score: number | null;
}
