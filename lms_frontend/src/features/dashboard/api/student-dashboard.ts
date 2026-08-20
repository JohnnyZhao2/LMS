import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useWorkbench } from '@/hooks/use-workbench';
import type { StudentDashboard, TaskParticipant } from '@/features/dashboard/types';

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (taskLimit = 10, knowledgeLimit = 6) => {
  const workbench = useWorkbench();
  return useQuery({
    queryKey: queryKeys.dashboards.student({ taskLimit, knowledgeLimit }),
    queryFn: () =>
      apiClient.get<StudentDashboard>(
        `/dashboard/student/?task_limit=${taskLimit}&knowledge_limit=${knowledgeLimit}`,
      ),
    enabled: workbench === 'learn',
  });
};

/**
 * 获取任务参与者进度
 */
export const useTaskParticipants = (taskId: number | null) => {
  const workbench = useWorkbench();
  return useQuery({
    queryKey: queryKeys.dashboards.taskParticipants(taskId),
    queryFn: () =>
      apiClient.get<TaskParticipant[]>(
        `/dashboard/student/task/${taskId}/participants/`,
      ),
    enabled: workbench === 'learn' && taskId !== null,
  });
};
