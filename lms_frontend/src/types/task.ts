/**
 * 任务相关类型定义
 */

import type { TaskStatus } from './common';
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
  line_tag_name?: string | null;
  content_preview?: string;
  order: number;
  resource_uuid: string;
  is_current: boolean;
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
  is_current: boolean;
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
  knowledge_items: TaskKnowledge[];
  quizzes: TaskQuiz[];
  assignments: TaskAssignment[];
  created_by_name: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  has_progress: boolean;
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
  exam_total?: number;
  exam_completed?: number;
  practice_total?: number;
  practice_completed?: number;
}

/**
 * 学员学习任务知识项
 */
export interface LearningTaskKnowledgeItem {
  id: number;
  knowledge_id: number;
  title: string;
  line_tag_name?: string | null;
  content_preview: string;
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
 * 学员待办任务
 */
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
  exam_total?: number;
  exam_completed?: number;
  practice_total?: number;
  practice_completed?: number;
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
  knowledge_count: number;
  quiz_count: number;
  exam_count: number;
  practice_count: number;
  assignee_count: number;
  /** 已完成的学员数量 */
  completed_count: number;
  created_by?: number;
  created_by_name: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  has_progress: boolean;
}
