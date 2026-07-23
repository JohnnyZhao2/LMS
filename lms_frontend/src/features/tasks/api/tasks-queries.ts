import {
  keepPreviousData,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { gradingQueryKeys } from '@/features/assessment/api/grading-queries';
import { usersQueryKeys } from '@/features/user-management/api/users-queries';
import { useCurrentRole } from '@/hooks/use-current-role';
import { ApiError } from '@/lib/api-client';
import { showApiError } from '@/lib/api-error-handler';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import {
  normalizeRoleKey,
  type QueryRole,
} from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';

import {
  completeKnowledge,
  createTask,
  deleteTask,
  getAssignableUsers,
  getStudentExecutions,
  getStudentLearningTaskDetail,
  getStudentTasks,
  getTaskAnalytics,
  getTaskDetail,
  getTaskResourceOptions,
  getTasks,
  updateTask,
  type GetStudentTasksParams,
  type GetTaskResourceOptionsParams,
  type GetTasksParams,
} from '@/features/tasks/api/tasks-api';

export type { TaskCreateRequest, TaskUpdateRequest } from '@/features/tasks/api/tasks-api';

export const tasksQueryKeys = {
  all: () => ['tasks'] as const,
  list: ({
    currentRole,
    page,
    pageSize,
    search,
    taskStatus,
    creatorSide,
  }: {
    currentRole: QueryRole;
    page: number;
    pageSize: number;
    search?: string;
    taskStatus?: string;
    creatorSide?: string;
  }) => [
    'tasks',
    normalizeRoleKey(currentRole),
    page,
    pageSize,
    search,
    taskStatus,
    creatorSide,
  ] as const,
  detailRoot: () => ['task-detail'] as const,
  detail: ({
    currentRole,
    id,
  }: {
    currentRole: QueryRole;
    id: number;
  }) => ['task-detail', normalizeRoleKey(currentRole), id] as const,
  studentRoot: () => ['student-tasks'] as const,
  studentList: ({
    currentRole,
    page,
    pageSize,
    status,
    search,
  }: {
    currentRole: QueryRole;
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }) =>
    ['student-tasks', normalizeRoleKey(currentRole), page, pageSize, status, search] as const,
  studentLearningDetailRoot: () => ['student-learning-task-detail'] as const,
  studentLearningDetail: ({
    currentRole,
    taskId,
  }: {
    currentRole: QueryRole;
    taskId: number;
  }) => ['student-learning-task-detail', normalizeRoleKey(currentRole), taskId] as const,
  resourceOptionsRoot: () => ['task-resource-options'] as const,
  resourceOptions: ({
    currentRole,
    resourceType,
    search,
    page,
    pageSize,
    excludeDocumentIds,
    excludeQuizIds,
  }: {
    currentRole: QueryRole;
    resourceType: string;
    search: string;
    page: number;
    pageSize: number;
    excludeDocumentIds: string;
    excludeQuizIds: string;
  }) => [
    'task-resource-options',
    normalizeRoleKey(currentRole),
    resourceType,
    search,
    page,
    pageSize,
    excludeDocumentIds,
    excludeQuizIds,
  ] as const,
} as const;

/** 任务 CRUD 后失效相关缓存 */
export const invalidateAfterTaskMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    tasksQueryKeys.all(),
    tasksQueryKeys.detailRoot(),
    tasksQueryKeys.studentRoot(),
    tasksQueryKeys.studentLearningDetailRoot(),
  ]);

/** 任务进度（如完成知识节点）后失效相关缓存 */
export const invalidateAfterTaskProgressMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    tasksQueryKeys.studentRoot(),
    tasksQueryKeys.detailRoot(),
    tasksQueryKeys.studentLearningDetailRoot(),
  ]);

export const useTaskList = (
  params: GetTasksParams = {},
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const {
    page = 1,
    pageSize = 20,
    search = '',
    taskStatus = 'all',
    creatorSide = 'all',
  } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: tasksQueryKeys.list({
      currentRole,
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    }),
    queryFn: () => getTasks({ page, pageSize, search, taskStatus, creatorSide }),
    enabled: currentRole !== null && enabled,
  });
};

export const useTaskDetail = (id: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: tasksQueryKeys.detail({ currentRole, id }),
    queryFn: () => getTaskDetail(id),
    enabled: Boolean(id) && currentRole !== null && enabled,
  });
};

export const useStudentTasks = (
  params: GetStudentTasksParams = {},
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, status, search = '' } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: tasksQueryKeys.studentList({ currentRole, page, pageSize, status, search }),
    queryFn: () => getStudentTasks({ page, pageSize, status, search }),
    enabled: currentRole !== null && enabled,
    placeholderData: keepPreviousData,
  });
};

export const useStudentLearningTaskDetail = (
  taskId: number,
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: tasksQueryKeys.studentLearningDetail({ currentRole, taskId }),
    queryFn: () => getStudentLearningTaskDetail(taskId),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};

export interface UseTaskResourceOptions extends GetTaskResourceOptionsParams {
  enabled?: boolean;
}

export const useTaskResourceOptions = (options: UseTaskResourceOptions = {}) => {
  const currentRole = useCurrentRole();
  const {
    search = '',
    page = 1,
    page_size = 10,
    resource_type = 'ALL',
    exclude_document_ids = [],
    exclude_quiz_ids = [],
    enabled = true,
  } = options;
  const excludeDocumentIds = exclude_document_ids.join(',');
  const excludeQuizIds = exclude_quiz_ids.join(',');

  return useQuery({
    queryKey: tasksQueryKeys.resourceOptions({
      currentRole,
      resourceType: resource_type,
      search,
      page,
      pageSize: page_size,
      excludeDocumentIds,
      excludeQuizIds,
    }),
    queryFn: () => getTaskResourceOptions(options),
    enabled: currentRole !== null && enabled,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
};

/** 可分配人员列表（接口在 tasks，key 归属 users） */
export const useAssignableUsers = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: usersQueryKeys.assignable(currentRole),
    queryFn: getAssignableUsers,
    enabled: currentRole !== null,
  });
};

export const useTaskAnalytics = (taskId: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: gradingQueryKeys.taskAnalytics({ currentRole, taskId }),
    queryFn: () => getTaskAnalytics(taskId),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};

export const useStudentExecutions = (
  taskId: number,
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: gradingQueryKeys.studentExecutions({ currentRole, taskId }),
    queryFn: () => getStudentExecutions(taskId),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};

/** 创建任务 */
export const useCreateTask = () => useAppMutation(createTask, invalidateAfterTaskMutation);

/** 更新任务 */
export const useUpdateTask = () =>
  useAppMutation(updateTask, invalidateAfterTaskMutation, {
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'INVALID_OPERATION') {
        showApiError(error);
      }
    },
  });

/** 删除任务 */
export const useDeleteTask = () => useAppMutation(deleteTask, invalidateAfterTaskMutation);

/** 完成任务中的知识学习节点 */
export const useCompleteKnowledge = () =>
  useAppMutation(completeKnowledge, invalidateAfterTaskProgressMutation);
