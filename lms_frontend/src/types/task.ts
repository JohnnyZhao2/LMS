/**
 * 任务相关类型定义
 */

import type { PaginatedResponse, TaskStatus } from './common';
import type { QuizType } from './quiz';

interface TaskActions {
  view: boolean;
  update: boolean;
  delete: boolean;
  analytics: boolean;
}

interface TaskAssignment {
  id: number;
  assignee: number;
  status: TaskStatus;
  completed_at?: string;
  score?: string;
  created_at: string;
  updated_at: string;
}

interface TaskKnowledge {
  id: number;
  knowledge?: number | null;
  knowledge_revision_id: number;
  knowledge_title: string;
  source_title?: string | null;
  space_tag_name?: string | null;
  content_preview?: string;
  order: number;
  revision_number: number;
}

export interface TaskQuiz {
  id: number;
  task_quiz_id: number;
  quiz?: number | null;
  quiz_revision_id: number;
  quiz_title: string;
  source_title?: string | null;
  question_count: number;
  total_score: number;
  order: number;
  revision_number: number;
  quiz_type: QuizType;
  quiz_type_display: string;
  duration?: number | null;
  pass_score?: string | null;
}

export interface TaskResourceOption {
  id: number;
  title: string;
  resource_type: 'DOCUMENT' | 'QUIZ';
  space_tag_name?: string | null;
  question_count?: number;
  quiz_type?: QuizType;
}

export interface TaskDetail {
  id: number;
  title: string;
  description?: string;
  deadline: string;
  knowledge_items: TaskKnowledge[];
  quizzes: TaskQuiz[];
  assignments: TaskAssignment[];
  created_by_name: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  has_progress: boolean;
  actions: TaskActions;
}

interface TaskProgress {
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

interface LearningTaskKnowledgeItem {
  id: number;
  knowledge_id?: number | null;
  knowledge_revision_id: number;
  title: string;
  space_tag_name?: string | null;
  content_preview: string;
  order: number;
  is_completed: boolean;
  completed_at?: string;
}

export interface LearningTaskQuizItem {
  id: number;
  quiz: number;
  quiz_id: number;
  task_quiz_id: number;
  quiz_revision_id: number;
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

export interface StudentLearningTaskDetail {
  id: number;
  task_id: number;
  task_title: string;
  task_description?: string;
  deadline: string;
  created_by_name: string;
  status: TaskStatus;
  status_display: string;
  progress: TaskProgress;
  completed_at?: string;
  score?: string | number | null;
  knowledge_items: LearningTaskKnowledgeItem[];
  quiz_items: LearningTaskQuizItem[];
  created_at: string;
  updated_at: string;
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

export type StudentTaskCenterResponse = PaginatedResponse<StudentTaskCenterItem>;

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
  completed_count: number;
  pending_grading_count: number;
  abnormal_count: number;
  created_by_name: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  actions: TaskActions;
}
