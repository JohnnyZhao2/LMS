import type { RoleCode, Workbench } from '@/types/common';

export type DashboardVariant = 'student' | 'mentor' | 'admin';

export const getDashboardVariant = (
  workbench: Workbench,
  managementRole: RoleCode | null | undefined,
  isSuperuser = false,
): DashboardVariant => {
  if (workbench === 'learn') {
    return 'student';
  }
  if (managementRole === 'MENTOR' || managementRole === 'DEPT_MANAGER') {
    return 'mentor';
  }
  if (managementRole === 'ADMIN' || isSuperuser) {
    return 'admin';
  }
  return 'student';
};
