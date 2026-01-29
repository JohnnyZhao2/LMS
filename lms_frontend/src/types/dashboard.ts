/**
 * 仪表盘相关类型定义
 */

import type { StudentPendingTask } from './task';
import type { LatestKnowledge } from './knowledge';

/**
 * 学员仪表盘
 */
export interface StudentDashboard {
  pending_tasks: StudentPendingTask[];
  latest_knowledge: LatestKnowledge[];
  task_summary: Record<string, unknown>;
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
