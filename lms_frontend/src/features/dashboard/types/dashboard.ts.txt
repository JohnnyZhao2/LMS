/**
 * 仪表盘相关类型定义
 */

import type { LatestKnowledge } from '@/types/knowledge';
import type { TaskStatus } from '@/types/common';

/**
 * 学员统计数据
 */
interface StudentStats {
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
  status: TaskStatus;
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
}

export interface MentorDashboardSummary {
  total_students: number;
  monthly_tasks: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  overall_completion_rate: number;
  overall_avg_score: number | null;
}

export interface AdminDashboard {
  summary: AdminDashboardSummary;
}

export interface AdminDashboardSummary {
  weekly_active_users: number;
  monthly_tasks: number;
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

interface TeamManagerDepartmentGap {
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

interface TeamManagerDepartmentStudent {
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

/** 考试报表 */
export type ExamReportView = 'detail' | 'student' | 'exam';
export type ExamReportExportTemplate = 'detail' | 'student_summary' | 'exam_summary';

export interface ExamReportFiltersState {
  view: ExamReportView;
  examId?: number;
  studentId?: number;
  departmentId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ExamReportPagination {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ExamReportExamOption {
  id: number;
  label: string;
  exam_title: string;
  task_title: string;
  total_score?: number;
  pass_score?: number | null;
}

export interface ExamReportStudentOption {
  id: number;
  name: string;
  employee_id: string;
}

export interface ExamReportDepartmentOption {
  id: number;
  name: string;
}

export interface ExamReportDetailRow {
  student_id: number;
  student_name: string;
  employee_id: string;
  department_name: string;
  mentor_name: string;
  avatar_key: string;
  exam_id: number;
  exam_title: string;
  task_id: number;
  task_title: string;
  score: number | null;
  total_score: number;
  pass_score: number | null;
  rank: number | null;
  pass_status: string;
  submission_status: string;
  attempt_number: number | null;
  time_spent_minutes: number | null;
}

export interface ExamReportStudentRow {
  student_id: number;
  student_name: string;
  employee_id: string;
  department_name: string;
  mentor_name: string;
  avatar_key: string;
  scored_count: number;
  average_score: number | null;
  passed_count: number;
  pass_ratio: string;
  exam_scores: Record<string, number | null>;
  exam_pass: Record<string, string>;
}

export interface ExamReportResponse {
  view: ExamReportView;
  selected_exam_id: number | null;
  summary: {
    student_count: number;
    exam_count: number;
    record_count: number;
  };
  filters: {
    exams: ExamReportExamOption[];
    students: ExamReportStudentOption[];
    departments: ExamReportDepartmentOption[];
  };
  exams: ExamReportExamOption[];
  rows: Array<ExamReportDetailRow | ExamReportStudentRow>;
  pagination: ExamReportPagination;
}
