/**
 * Task Management API exports
 * @module features/tasks/api/management
 */

// Keys
export { taskManagementKeys } from './keys';

// Types
export type {
  TaskListParams,
  TaskListItem,
  LearningTaskCreateRequest,
  PracticeTaskCreateRequest,
  ExamTaskCreateRequest,
  TaskCreateRequest,
  AssignableStudent,
} from './types';

// APIs
export { fetchTaskList, useTaskList } from './get-task-list';
export { fetchTaskDetail, useTaskDetail } from './get-task-detail';
export { createTask, useCreateTask } from './create-task';
export { forceCloseTask, useForceCloseTask } from './force-close-task';
export { fetchAssignableStudents, useAssignableStudents } from './get-assignable-students';
export { 
  fetchAvailableKnowledge, 
  fetchAvailableQuizzes, 
  useAvailableKnowledge, 
  useAvailableQuizzes 
} from './get-available-resources';
