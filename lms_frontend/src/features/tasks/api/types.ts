/**
 * Task API Types
 * Type definitions for task API
 * @module features/tasks/api/types
 */

import type { 
  TaskAssignment, 
  KnowledgeLearningProgress,
  QuizProgress
} from '@/types/domain';

/**
 * Extended Task Assignment with progress details
 */
export interface TaskAssignmentDetail extends TaskAssignment {
  knowledge_progress?: KnowledgeLearningProgress[];
  quiz_progress?: QuizProgress[];
}

/**
 * Task list response type
 */
export interface TaskListResponse {
  assignments: TaskAssignmentDetail[];
  total: number;
}
