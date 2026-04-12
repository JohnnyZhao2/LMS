import { useMemo } from 'react';
import type { RoleCode } from '@/types/common';
import { getMenuItemsBySection, type MenuItem } from '@/app/app-route-meta';
import { useAuth } from '@/features/auth/stores/auth-context';

export type { MenuItem };

export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  const { hasCapability, hasAnyCapability } = useAuth();

  return useMemo(
    () => getMenuItemsBySection(currentRole, hasCapability, hasAnyCapability, 'main'),
    [currentRole, hasCapability, hasAnyCapability],
  );
};

export const useRoleSettingsMenu = (currentRole: RoleCode | null): MenuItem[] => {
  const { hasCapability, hasAnyCapability } = useAuth();

  return useMemo(
    () => getMenuItemsBySection(currentRole, hasCapability, hasAnyCapability, 'settings'),
    [currentRole, hasCapability, hasAnyCapability],
  );
};
