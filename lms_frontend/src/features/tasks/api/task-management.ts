/**
 * Task Management API
 * API functions for creating and managing tasks (导师/室经理/管理员)
 * Requirements: 14.1 - Task list, create learning/practice/exam tasks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Task, TaskType, Knowledge, Quiz } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

// ============================================
// Types
// ============================================

export interface TaskListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: TaskType;
  status?: 'ACTIVE' | 'CLOSED';
}

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

// ============================================
// Query Keys
// ============================================

export const taskManagementKeys = {
  all: ['task-management'] as const,
  lists: () => [...taskManagementKeys.all, 'list'] as const,
  list: (params: TaskListParams) => [...taskManagementKeys.lists(), params] as const,
  details: () => [...taskManagementKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...taskManagementKeys.details(), id] as const,
  assignableStudents: () => [...taskManagementKeys.all, 'assignable-students'] as const,
};

// ============================================
// API Functions
// ============================================

/**
 * Fetch task list for management (导师/室经理/管理员)
 * Requirements: 14.1 - Display task list with type and status filter
 */
export async function fetchTaskList(
  params: TaskListParams = {}
): Promise<PaginatedResponse<TaskListItem>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  if (params.status) searchParams.set('status', params.status);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.tasks.list}?${queryString}` 
    : API_ENDPOINTS.tasks.list;
  
  return api.get<PaginatedResponse<TaskListItem>>(url);
}

/**
 * Fetch single task detail
 */
export async function fetchTaskDetail(id: number | string): Promise<Task> {
  return api.get<Task>(API_ENDPOINTS.tasks.detail(id));
}

/**
 * Create a new task
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.13
 */
export async function createTask(data: TaskCreateRequest): Promise<Task> {
  return api.post<Task>(API_ENDPOINTS.tasks.list, data);
}

/**
 * Force close a task (admin only)
 * Requirements: 14.14 - Admin can force close tasks
 */
export async function forceCloseTask(id: number | string): Promise<Task> {
  return api.post<Task>(`${API_ENDPOINTS.tasks.detail(id)}close/`, {});
}

/**
 * Fetch assignable students based on current user's role
 * Requirements: 14.10, 14.11, 14.12
 * - Mentor: only their mentees
 * - Dept Manager: only department members
 * - Admin: all students
 */
export async function fetchAssignableStudents(): Promise<AssignableStudent[]> {
  // The backend will filter based on the current user's role
  return api.get<AssignableStudent[]>(`${API_ENDPOINTS.tasks.list}assignable-students/`);
}

/**
 * Fetch available knowledge documents for task creation
 */
export async function fetchAvailableKnowledge(): Promise<Knowledge[]> {
  const response = await api.get<PaginatedResponse<Knowledge> | Knowledge[]>(
    `${API_ENDPOINTS.knowledge.list}?page_size=1000`
  );
  // Handle both paginated and array responses
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
}

/**
 * Fetch available quizzes for task creation
 */
export async function fetchAvailableQuizzes(): Promise<Quiz[]> {
  const response = await api.get<PaginatedResponse<Quiz> | Quiz[]>(
    `${API_ENDPOINTS.quizzes.list}?page_size=1000`
  );
  // Handle both paginated and array responses
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch task list for management
 * Requirements: 14.1 - Display task list
 */
export function useTaskList(params: TaskListParams = {}) {
  return useQuery({
    queryKey: taskManagementKeys.list(params),
    queryFn: () => fetchTaskList(params),
  });
}

/**
 * Hook to fetch task detail
 */
export function useTaskDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: taskManagementKeys.detail(id!),
    queryFn: () => fetchTaskDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new task
 * Requirements: 14.13 - Submit task creation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskManagementKeys.lists() });
    },
  });
}

/**
 * Hook to force close a task
 * Requirements: 14.14 - Admin force close
 */
export function useForceCloseTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: forceCloseTask,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskManagementKeys.detail(id) });
    },
  });
}

/**
 * Hook to fetch assignable students
 * Requirements: 14.10, 14.11, 14.12 - Role-based student filtering
 */
export function useAssignableStudents() {
  return useQuery({
    queryKey: taskManagementKeys.assignableStudents(),
    queryFn: fetchAssignableStudents,
  });
}

/**
 * Hook to fetch available knowledge documents
 */
export function useAvailableKnowledge() {
  return useQuery({
    queryKey: ['available-knowledge'],
    queryFn: fetchAvailableKnowledge,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch available quizzes
 */
export function useAvailableQuizzes() {
  return useQuery({
    queryKey: ['available-quizzes'],
    queryFn: fetchAvailableQuizzes,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
