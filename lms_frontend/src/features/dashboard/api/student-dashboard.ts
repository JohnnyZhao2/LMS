import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { StudentDashboard, TaskParticipant } from '@/types/api';

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (taskLimit = 10, knowledgeLimit = 6) => {
  const currentRole = useCurrentRole();
  const { hasCapability } = useAuth();
  return useQuery({
    queryKey: ['student-dashboard', currentRole ?? 'UNKNOWN', taskLimit, knowledgeLimit],
    queryFn: () =>
      apiClient.get<StudentDashboard>(
        `/dashboard/student/?task_limit=${taskLimit}&knowledge_limit=${knowledgeLimit}`,
      ),
    enabled: currentRole !== null && hasCapability('dashboard.student.view'),
  });
};

/**
 * 获取任务参与者进度
 */
export const useTaskParticipants = (taskId: number | null) => {
  const { hasCapability } = useAuth();
  return useQuery({
    queryKey: ['task-participants', taskId],
    queryFn: () =>
      apiClient.get<TaskParticipant[]>(
        `/dashboard/student/task/${taskId}/participants/`,
      ),
    enabled: taskId !== null && hasCapability('dashboard.student.view'),
  });
};
