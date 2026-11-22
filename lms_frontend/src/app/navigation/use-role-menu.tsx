import { useMemo } from 'react';
import type { Workbench } from '@/types/common';
import { getMenuItemsBySection, type MenuItem } from '@/app/menu-builder';
import { useAuth } from '@/lib/auth';

export type { MenuItem };

export const useRoleMenu = (workbench: Workbench): MenuItem[] => {
  const { hasCapability } = useAuth();
  const showManageDashboard = hasCapability('tasks.view_task_analytics');

  return useMemo(
    () => getMenuItemsBySection(workbench, hasCapability, showManageDashboard),
    [hasCapability, showManageDashboard, workbench],
  );
};
