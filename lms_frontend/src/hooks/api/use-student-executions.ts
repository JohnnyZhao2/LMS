import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { StudentExecution } from '@/types/task-analytics';

export const getStudentExecutions = (taskId: number) =>
  apiClient.get<StudentExecution[]>(`/tasks/${taskId}/student-executions/`);

export const useStudentExecutions = (taskId: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.studentExecutions({ currentRole, taskId }),
    queryFn: () => getStudentExecutions(taskId),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};
