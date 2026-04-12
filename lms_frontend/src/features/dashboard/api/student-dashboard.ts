import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { StudentDashboard, TaskParticipant } from '@/types/dashboard';

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (taskLimit = 10, knowledgeLimit = 6) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['student-dashboard', currentRole ?? 'UNKNOWN', taskLimit, knowledgeLimit],
    queryFn: () =>
      apiClient.get<StudentDashboard>(
        `/dashboard/student/?task_limit=${taskLimit}&knowledge_limit=${knowledgeLimit}`,
      ),
    enabled: currentRole === 'STUDENT',
  });
};

/**
 * 获取任务参与者进度
 */
export const useTaskParticipants = (taskId: number | null) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['task-participants', taskId],
    queryFn: () =>
      apiClient.get<TaskParticipant[]>(
        `/dashboard/student/task/${taskId}/participants/`,
      ),
    enabled: currentRole === 'STUDENT' && taskId !== null,
  });
};
