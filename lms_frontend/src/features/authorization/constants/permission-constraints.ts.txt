import type { PermissionCatalogItem, RoleCode } from '@/types/api';

export const CONFIG_PERMISSION_MODULE = 'config';
export const CONFIG_PERMISSION_MANAGEABLE_ROLE: RoleCode = 'ADMIN';

export const isConfigModuleLockedForRole = (roleCode: RoleCode, moduleCode: string): boolean => (
  moduleCode === CONFIG_PERMISSION_MODULE && roleCode !== CONFIG_PERMISSION_MANAGEABLE_ROLE
);

export const isPermissionLockedForRole = (
  roleCode: RoleCode,
  permission: Pick<PermissionCatalogItem, 'module'>,
): boolean => isConfigModuleLockedForRole(roleCode, permission.module);
