import { useMemo } from 'react';
import type { RoleCode } from '@/types/common';
import { getMenuItemsBySection, type MenuItem } from '@/app/app-route-meta';
import { useAuth } from '@/session/auth/auth-context';

export type { MenuItem };

export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  const { hasCapability, hasAnyCapability } = useAuth();

  return useMemo(
    () => getMenuItemsBySection(currentRole, hasCapability, hasAnyCapability),
    [currentRole, hasCapability, hasAnyCapability],
  );
};
