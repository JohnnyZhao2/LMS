import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getAdminDashboard,
  getExamReport,
  getMentorDashboard,
  getStudentDashboard,
  getTaskParticipants,
  getTeamManagerDashboard,
} from '@/features/dashboard/api/dashboard-api';
import type { ExamReportFiltersState } from '@/features/dashboard/types/dashboard';
import { buildExamReportQueryString } from '@/features/dashboard/utils/exam-report-query';
import { useCurrentRole } from '@/hooks/use-current-role';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';

export const dashboardQueryKeys = {
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
  teamManager: (currentRole: QueryRole) =>
    ['team-manager-dashboard', normalizeRoleKey(currentRole)] as const,
  examReport: ({
    currentRole,
    filters,
  }: {
    currentRole: QueryRole;
    filters: string;
  }) => ['exam-report', normalizeRoleKey(currentRole), filters] as const,
} as const;

const EXAM_REPORT_ROLES = new Set(['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

/**
 * 获取管理员仪表盘数据
 */
export const useAdminDashboard = () => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: dashboardQueryKeys.admin(currentRole),
    queryFn: getAdminDashboard,
    enabled: currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

/**
 * 获取导师/室经理仪表盘数据
 */
export const useMentorDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: dashboardQueryKeys.mentor(currentRole),
    queryFn: getMentorDashboard,
    enabled: currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER',
    staleTime: 0, // 数据立即过期，确保角色切换时重新获取
    refetchOnMount: 'always', // 组件挂载时总是重新获取
  });
};

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (taskLimit = 10, knowledgeLimit = 6) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: dashboardQueryKeys.student({ currentRole, taskLimit, knowledgeLimit }),
    queryFn: () => getStudentDashboard(taskLimit, knowledgeLimit),
    enabled: currentRole === 'STUDENT',
  });
};

export const useTaskParticipants = (taskId: number | null) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: dashboardQueryKeys.taskParticipants(taskId),
    queryFn: () => getTaskParticipants(taskId!),
    enabled: currentRole === 'STUDENT' && taskId !== null,
  });
};

/**
 * 获取团队经理仪表盘数据
 */
export const useTeamManagerDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: dashboardQueryKeys.teamManager(currentRole),
    queryFn: getTeamManagerDashboard,
    enabled: currentRole === 'TEAM_MANAGER',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useExamReport = (filters: ExamReportFiltersState) => {
  const currentRole = useCurrentRole();
  const enabled = EXAM_REPORT_ROLES.has(currentRole ?? '');
  const query = buildExamReportQueryString(filters, { includePagination: true });

  return useQuery({
    queryKey: dashboardQueryKeys.examReport({ currentRole, filters: query }),
    queryFn: () => getExamReport(filters),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
};
