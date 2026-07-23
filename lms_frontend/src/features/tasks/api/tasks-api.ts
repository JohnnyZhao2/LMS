import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import type { PaginatedResponse, TaskStatus, UserList } from '@/types/common';
import type { StudentExecution, TaskAnalytics } from '@/types/task-analytics';
import type {
  StudentLearningTaskDetail,
  StudentTaskCenterResponse,
  TaskDetail,
  TaskListItem,
  TaskResourceOption,
} from '@/types/task';

/** 统一的任务创建请求 */
export interface TaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  knowledge_ids?: number[];
  quiz_ids?: number[];
  assignee_ids: number[];
}

/** 更新任务请求 */
export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  deadline?: string;
  knowledge_ids?: number[];
  quiz_ids?: number[];
  assignee_ids?: number[];
}

export interface GetTasksParams {
  page?: number;
  pageSize?: number;
  search?: string;
  taskStatus?: 'open' | 'closed' | 'all';
  creatorSide?: 'all' | 'management' | 'non_management';
}

export interface GetStudentTasksParams {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  search?: string;
}

export interface GetTaskResourceOptionsParams {
  search?: string;
  page?: number;
  page_size?: number;
  resource_type?: 'ALL' | 'DOCUMENT' | 'QUIZ';
  exclude_document_ids?: number[];
  exclude_quiz_ids?: number[];
}

export const getTasks = ({
  page = 1,
  pageSize = 20,
  search = '',
  taskStatus = 'all',
  creatorSide = 'all',
}: GetTasksParams = {}) =>
  apiClient.get<PaginatedResponse<TaskListItem>>(
    `/tasks/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      ...(search && { search }),
      ...(taskStatus !== 'all' && { status: taskStatus }),
      ...(creatorSide !== 'all' && { creator_side: creatorSide }),
    })}`,
  );

export const getTaskDetail = (id: number) =>
  apiClient.get<TaskDetail>(`/tasks/${id}/`);

export const getStudentTasks = ({
  page = 1,
  pageSize = 20,
  status,
  search = '',
}: GetStudentTasksParams = {}) =>
  apiClient.get<StudentTaskCenterResponse>(
    `/tasks/my-assignments/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      ...(status && { status }),
      ...(search && { search }),
    })}`,
  );

export const getStudentLearningTaskDetail = (taskId: number) =>
  apiClient.get<StudentLearningTaskDetail>(`/tasks/${taskId}/detail/`);

export const getTaskResourceOptions = ({
  search = '',
  page = 1,
  page_size = 10,
  resource_type = 'ALL',
  exclude_document_ids = [],
  exclude_quiz_ids = [],
}: GetTaskResourceOptionsParams = {}) =>
  apiClient.get<PaginatedResponse<TaskResourceOption>>(
    `/tasks/resource-options/${buildQueryString({
      resource_type,
      page: String(page),
      page_size: String(page_size),
      ...(search && { search }),
      ...(exclude_document_ids.length && {
        exclude_document_ids: exclude_document_ids.join(','),
      }),
      ...(exclude_quiz_ids.length && { exclude_quiz_ids: exclude_quiz_ids.join(',') }),
    })}`,
  );

export const getAssignableUsers = () =>
  apiClient.get<UserList[]>('/tasks/assignable-users/');

export const getTaskAnalytics = (taskId: number) =>
  apiClient.get<TaskAnalytics>(`/tasks/${taskId}/analytics/`);

export const getStudentExecutions = (taskId: number) =>
  apiClient.get<StudentExecution[]>(`/tasks/${taskId}/student-executions/`);

export const createTask = (data: TaskCreateRequest) =>
  apiClient.post<TaskDetail>('/tasks/create/', data);

export const updateTask = ({
  taskId,
  data,
}: {
  taskId: number;
  data: TaskUpdateRequest;
}) => apiClient.patch<TaskDetail>(`/tasks/${taskId}/`, data);

export const deleteTask = (taskId: number) => apiClient.delete(`/tasks/${taskId}/`);

export const completeKnowledge = ({
  taskId,
  taskKnowledgeId,
}: {
  taskId: number;
  taskKnowledgeId: number;
}) =>
  apiClient.post(`/tasks/${taskId}/complete-knowledge/`, {
    task_knowledge_id: taskKnowledgeId,
  });
