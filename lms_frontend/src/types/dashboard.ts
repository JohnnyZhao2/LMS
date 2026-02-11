/**
 * 仪表盘相关类型定义
 */

import type { LatestKnowledge } from './knowledge';

/**
 * 学员预警类型
 */
export type AlertLevel = 'high' | 'medium' | 'low';

/**
 * 学员预警信息
 */
export interface StudentAlert {
  type: 'overdue' | 'failed_exam' | 'slow_progress' | 'score_decline';
  level: AlertLevel;
  message: string;
  count?: number;
  tasks?: { task_id: number; task_title: string }[];
  score?: number;
  quiz_title?: string;
  task_id?: number | null;
  task_title?: string | null;
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
  students: MentorDashboardStudent[];
  overdue_warning: MentorDashboardOverdueWarning;
  pending_grading: { count: number };
  spot_check_stats: MentorDashboardSpotCheckStats;
  score_distribution: MentorDashboardScoreDistribution;
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

export interface MentorDashboardOverdueWarningItem {
  assignment_id: number;
  task_id: number;
  task_title: string;
  student_id: number;
  student_name: string;
  employee_id: string;
  department_name: string | null;
  deadline: string;
  urgency: 'OVERDUE' | 'DUE_SOON';
  hours_to_deadline: number;
}

export interface MentorDashboardOverdueWarning {
  overdue_count: number;
  due_soon_count: number;
  due_soon_hours: number;
  items: MentorDashboardOverdueWarningItem[];
}

export interface MentorDashboardSpotCheckStats {
  count: number;
  avg_score: number | null;
}

export interface MentorDashboardScoreDistribution {
  excellent: number;
  good: number;
  pass: number;
  fail: number;
  total: number;
}

export interface MentorDashboardRadarMetrics {
  completion_rate: number;
  overdue_rate: number;
  avg_score: number;
  monthly_active: number;
  spot_check_avg_score: number;
}

export interface MentorDashboardStudent {
  id: number;
  employee_id: string;
  username: string;
  department_name: string | null;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  overdue_rate: number;
  avg_score: number | null;
  exam_count: number;
  exam_passed_count: number;
  exam_pass_rate: number | null;
  monthly_active: boolean;
  spot_check_count_month: number;
  spot_check_avg_score_month: number | null;
  radar_metrics: MentorDashboardRadarMetrics;
}

/**
 * 团队经理仪表盘
 */
export interface TeamManagerDashboard {
  summary: TeamManagerDashboardSummary;
  department_comparison: TeamManagerDepartmentComparison;
  department_student_view: TeamManagerDepartmentStudentViewItem[];
}

export interface TeamManagerDashboardSummary {
  total_students: number;
  total_mentors: number;
  total_knowledge: number;
}

export interface TeamManagerDepartmentMetrics {
  department_id: number | null;
  department_name: string;
  student_count: number;
  mentor_count: number;
  avg_completion_rate: number;
  avg_score: number | null;
  weekly_active_users: number;
  weekly_active_rate: number;
}

export interface TeamManagerDepartmentGap {
  student_count: number;
  mentor_count: number;
  completion_rate: number;
  avg_score: number | null;
  weekly_active_rate: number;
}

export interface TeamManagerDepartmentComparison {
  left_department: TeamManagerDepartmentMetrics;
  right_department: TeamManagerDepartmentMetrics;
  gap: TeamManagerDepartmentGap;
}

export interface TeamManagerDepartmentStudent {
  student_id: number;
  student_name: string;
  mentor_name: string | null;
  completion_rate: number;
  avg_score: number | null;
  is_at_risk: boolean;
}

export interface TeamManagerDepartmentStudentViewItem {
  department_id: number;
  department_name: string;
  mentor_count: number;
  student_count: number;
  avg_completion_rate: number;
  avg_score: number | null;
  weekly_active_users: number;
  weekly_active_rate: number;
  at_risk_students: number;
  students: TeamManagerDepartmentStudent[];
}
