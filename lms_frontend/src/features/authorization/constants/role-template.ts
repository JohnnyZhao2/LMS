import type { RoleCode } from '@/types/api';

export const ROLE_TEMPLATE_ORDER: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];

export const ROLE_TEMPLATE_LABELS: Partial<Record<RoleCode, string>> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT_MANAGER: '室经理',
  TEAM_MANAGER: '团队经理',
  ADMIN: '管理员',
};
