import { AppLayout } from '@/app/layouts/app-layout';
import { StudentLayout } from '@/app/layouts/student-layout';
import {
  getAccessibleWorkspaceHome,
  getWorkspaceHome,
  normalizeRoleCode,
} from '@/session/workspace/role-paths';
import type { RoleCode } from '@/types/common';

export type DashboardVariant = 'student' | 'mentor' | 'global';
export type MenuVariant = 'student' | 'manager' | 'admin';

export interface WorkspaceConfig {
  home: string;
  layout: typeof AppLayout;
  dashboardVariant: DashboardVariant;
  menuVariant: MenuVariant;
}

const WORKSPACE_CONFIG: Record<RoleCode, WorkspaceConfig> = {
  STUDENT: {
    home: '/student/dashboard',
    layout: StudentLayout,
    dashboardVariant: 'student',
    menuVariant: 'student',
  },
  MENTOR: {
    home: '/mentor/dashboard',
    layout: AppLayout,
    dashboardVariant: 'mentor',
    menuVariant: 'manager',
  },
  DEPT: {
    home: '/dept/dashboard',
    layout: AppLayout,
    dashboardVariant: 'mentor',
    menuVariant: 'manager',
  },
  GLOBAL: {
    home: '/global/dashboard',
    layout: AppLayout,
    dashboardVariant: 'global',
    menuVariant: 'admin',
  },
  SUPER_ADMIN: {
    home: '/super_admin/dashboard',
    layout: AppLayout,
    dashboardVariant: 'global',
    menuVariant: 'admin',
  },
};

export const getWorkspaceConfig = (role: RoleCode | null | undefined): WorkspaceConfig | null => {
  if (!role) {
    return null;
  }
  return WORKSPACE_CONFIG[role] ?? null;
};

export {
  getAccessibleWorkspaceHome,
  getWorkspaceHome,
  normalizeRoleCode,
};
