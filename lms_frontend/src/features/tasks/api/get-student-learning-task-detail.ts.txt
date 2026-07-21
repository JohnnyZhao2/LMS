import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { StudentLearningTaskDetail } from '@/types/task';

interface UseStudentLearningTaskDetailOptions {
  enabled?: boolean;
}

export const getStudentLearningTaskDetail = (taskId: number) =>
  apiClient.get<StudentLearningTaskDetail>(`/tasks/${taskId}/detail/`);

export const useStudentLearningTaskDetail = (
  taskId: number,
  options: UseStudentLearningTaskDetailOptions = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.tasks.studentLearningDetail({ currentRole, taskId }),
    queryFn: () => getStudentLearningTaskDetail(taskId),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};
