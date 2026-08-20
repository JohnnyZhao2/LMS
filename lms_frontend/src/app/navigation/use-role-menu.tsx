import { useMemo } from 'react';
import type { Workbench } from '@/types/common';
import { getMenuItemsBySection, type MenuItem } from '@/app/menu-builder';
import { useAuth } from '@/lib/auth';

export type { MenuItem };

export const useRoleMenu = (workbench: Workbench): MenuItem[] => {
  const { hasCapability } = useAuth();

  return useMemo(
    () => getMenuItemsBySection(workbench, hasCapability),
    [hasCapability, workbench],
  );
};
