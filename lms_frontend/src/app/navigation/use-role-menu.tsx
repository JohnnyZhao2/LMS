import { useMemo } from 'react';
import type { Workbench } from '@/types/common';
import { getMenuItemsBySection } from '@/app/menu-builder';
import type { MenuItem } from '@/app/route-registry';
import { useAuth } from '@/session/auth/auth-context';

export type { MenuItem };

export const useRoleMenu = (workbench: Workbench): MenuItem[] => {
  const { hasCapability, hasAnyCapability } = useAuth();

  return useMemo(
    () => getMenuItemsBySection(workbench, hasCapability, hasAnyCapability),
    [hasAnyCapability, hasCapability, workbench],
  );
};
