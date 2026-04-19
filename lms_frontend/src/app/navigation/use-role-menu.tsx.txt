import { useMemo } from 'react';
import type { RoleCode } from '@/types/common';
import { getMenuItemsBySection } from '@/app/menu-builder';
import type { MenuItem } from '@/app/route-registry';
import { useAuth } from '@/session/auth/auth-context';

export type { MenuItem };

export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  const { hasCapability, hasAnyCapability } = useAuth();

  return useMemo(
    () => getMenuItemsBySection(currentRole, hasCapability, hasAnyCapability),
    [currentRole, hasCapability, hasAnyCapability],
  );
};
