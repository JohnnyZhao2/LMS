import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const dashboardsQueryKeys = {
    admin: (currentRole: QueryRole) => ['admin-dashboard', normalizeRoleKey(currentRole)] as const,
    mentor: (currentRole: QueryRole) => ['mentor-dashboard', normalizeRoleKey(currentRole)] as const,
    student: ({
      currentRole,
      taskLimit,
      knowledgeLimit,
    }: {
      currentRole: QueryRole;
      taskLimit: number;
      knowledgeLimit: number;
    }) => ['student-dashboard', normalizeRoleKey(currentRole), taskLimit, knowledgeLimit] as const,
    taskParticipants: (taskId: number | null) => ['task-participants', taskId] as const,
    teamManager: (currentRole: QueryRole) => ['team-manager-dashboard', normalizeRoleKey(currentRole)] as const,
    examReport: ({
      currentRole,
      filters,
    }: {
      currentRole: QueryRole;
      filters: string;
    }) => ['exam-report', normalizeRoleKey(currentRole), filters] as const,
} as const;
