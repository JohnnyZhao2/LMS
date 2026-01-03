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
  mentees_count: number;
  completion_rate: string;
  average_score?: string;
  pending_grading_count: number;
}
