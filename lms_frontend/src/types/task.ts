/**
 * 任务相关类型定义
 */

import type { TaskStatus, SimpleTag } from './common';
import type { QuizType } from './quiz';

/**
 * 任务分配
 */
export interface TaskAssignment {
  id: number;
  assignee: number;
  assignee_name: string;
  assignee_employee_id: string;
  status: TaskStatus;
  completed_at?: string;
  score?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 任务知识项
 */
export interface TaskKnowledge {
  id: number;
  knowledge: number;
  knowledge_title: string;
  knowledge_type: string;
  knowledge_type_display: string;
  summary?: string;
  order: number;
  resource_uuid: string;
  version_number: number;
}

/**
 * 任务试卷项
 */
export interface TaskQuiz {
  id: number;
  quiz: number;
  quiz_title: string;
  question_count: number;
  total_score: number;
  subjective_question_count: number;
  objective_question_count: number;
  order: number;
  resource_uuid: string;
  version_number: number;
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: string | null;
}

/**
 * 任务详情
 */
export interface TaskDetail {
  id: number;
  title: string;
  description?: string;
  deadline: string;
  start_time?: string;
  duration?: number;
  pass_score?: string;
  is_closed: boolean;
  closed_at?: string;
  knowledge_items: TaskKnowledge[];
  quizzes: TaskQuiz[];
  assignments: TaskAssignment[];
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * 学员学习任务进度
 */
export interface LearningTaskProgress {
  completed: number;
  total: number;
  percentage: number;
  knowledge_total?: number;
  knowledge_completed?: number;
  quiz_total?: number;
  quiz_completed?: number;
}

/**
 * 学员学习任务知识项
 */
export interface LearningTaskKnowledgeItem {
  id: number;
  knowledge_id: number;
  title: string;
  knowledge_type: string;
  knowledge_type_display: string;
  summary: string;
  order: number;
  is_completed: boolean;
  completed_at?: string;
}

/**
 * 学员学习任务试卷项
 */
export interface LearningTaskQuizItem {
  id: number;
  quiz: number;
  quiz_id: number;
  quiz_title: string;
  quiz_type: string;
  quiz_type_display: string;
  description?: string;
  question_count: number;
  total_score: number;
  duration?: number | null;
  pass_score?: number | string | null;
  order: number;
  is_completed: boolean;
  score?: number | null;
  latest_submission_id?: number | null;
  latest_status?: string | null;
}

/**
 * 学员学习任务详情
 */
export interface StudentLearningTaskDetail {
  id: number;
  task_id: number;
  task_title: string;
  task_description?: string;

  deadline: string;
  created_by_name: string;
  status: TaskStatus;
  status_display: string;
  progress: LearningTaskProgress;
  completed_at?: string;
  score?: string | number | null;
  knowledge_items: LearningTaskKnowledgeItem[];
  quiz_items: LearningTaskQuizItem[];
  created_at: string;
  updated_at: string;
}

/**
 * 创建学习任务请求
 */
export interface LearningTaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  knowledge_ids: number[];
  assignee_ids: number[];
}

/**
 * 创建练习任务请求
 */
export interface PracticeTaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  quiz_ids: number[];
  knowledge_ids?: number[];
  assignee_ids: number[];
}

/**
 * 创建考试任务请求
 */
export interface ExamTaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  start_time: string;
  duration: number;
  pass_score: number | string;
  quiz_id: number;
  assignee_ids: number[];
}

/**
 * 学员待办任务
 */
export interface StudentPendingTask {
  id: number;
  task_id: number;
  task_title: string;
  deadline: string;
  created_by_name: string;
  status: TaskStatus;
  status_display: string;
  progress: LearningTaskProgress;
  created_at: string;
}

/**
 * 学员任务中心列表项
 */
export interface TaskProgress {
  completed: number;
  total: number;
  percentage: number;
  knowledge_total?: number;
  knowledge_completed?: number;
  quiz_total?: number;
  quiz_completed?: number;
}

export interface StudentTaskCenterItem {
  id: number;
  task_id: number;
  task_title: string;
  task_description?: string;
  has_quiz: boolean;
  has_knowledge: boolean;
  deadline: string;
  status: TaskStatus;
  status_display: string;
  progress: TaskProgress;
  created_by_name: string;
  score?: string;
  completed_at?: string;
  created_at: string;
}

export interface StudentTaskCenterResponse {
  results: StudentTaskCenterItem[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TaskListItem {
  id: number;
  title: string;
  description?: string;
  deadline: string;
  start_time?: string;
  duration?: number;
  pass_score?: string;
  is_closed: boolean;
  closed_at?: string;
  knowledge_count: number;
  quiz_count: number;
  assignee_count: number;
  /** 已完成的学员数量 */
  completed_count: number;
  /** 及格率（百分比，如 85.5 表示 85.5%） */
  pass_rate?: number | null;
  created_by?: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}
