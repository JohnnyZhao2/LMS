/**
 * Task Management API Types
 * Type definitions for task management API
 * @module features/tasks/api/management/types
 */

import type { Task, TaskType } from '@/types/domain';

/**
 * Task list params for filtering
 */
export interface TaskListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: TaskType;
  status?: 'ACTIVE' | 'CLOSED';
}

/**
 * Task list item with additional counts
 */
export interface TaskListItem extends Task {
  assignment_count: number;
  completed_count: number;
}

/**
 * Request type for creating a learning task
 * Requirements: 14.2, 14.6 - Learning task with knowledge documents
 */
export interface LearningTaskCreateRequest {
  type: 'LEARNING';
  title: string;
  description?: string;
  deadline: string;
  knowledge_ids: number[];
  assignee_ids: number[];
}

/**
 * Request type for creating a practice task
 * Requirements: 14.2, 14.7 - Practice task with quizzes and optional knowledge
 */
export interface PracticeTaskCreateRequest {
  type: 'PRACTICE';
  title: string;
  description?: string;
  deadline: string;
  quiz_ids: number[];
  knowledge_ids?: number[];
  assignee_ids: number[];
}

/**
 * Request type for creating an exam task
 * Requirements: 14.2, 14.4, 14.8 - Exam task with single quiz and exam settings
 */
export interface ExamTaskCreateRequest {
  type: 'EXAM';
  title: string;
  description?: string;
  deadline: string;
  start_time: string;
  duration: number;       // in minutes
  pass_score: number;
  quiz_id: number;        // single quiz for exam
  assignee_ids: number[];
}

/**
 * Union type for task creation requests
 */
export type TaskCreateRequest = 
  | LearningTaskCreateRequest 
  | PracticeTaskCreateRequest 
  | ExamTaskCreateRequest;

/**
 * Assignable student type
 * Requirements: 14.10, 14.11, 14.12 - Students filtered by role
 */
export interface AssignableStudent {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  department?: {
    id: number;
    name: string;
  };
}
