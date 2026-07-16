import { useQuery } from '@tanstack/react-query';

import type { TaskParticipant } from '@/features/dashboard/types/dashboard';
import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export const getTaskParticipants = (taskId: number) =>
  apiClient.get<TaskParticipant[]>(`/dashboard/student/task/${taskId}/participants/`);

export const useTaskParticipants = (taskId: number | null) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.dashboards.taskParticipants(taskId),
    queryFn: () => getTaskParticipants(taskId!),
    enabled: currentRole === 'STUDENT' && taskId !== null,
  });
};
