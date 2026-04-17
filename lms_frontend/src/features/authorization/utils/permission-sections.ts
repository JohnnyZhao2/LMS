import { getModulePresentation } from '@/features/authorization/constants/permission-presentation';
import type { PermissionCatalogItem } from '@/types/authorization';

export interface PermissionModuleSection {
  module: string;
  permissions: PermissionCatalogItem[];
}

export const buildPermissionModuleSections = (
  permissionCatalog: PermissionCatalogItem[],
): PermissionModuleSection[] => {
  const groupedPermissions = new Map<string, PermissionCatalogItem[]>();

  permissionCatalog.forEach((permission) => {
    const currentPermissions = groupedPermissions.get(permission.module) ?? [];
    groupedPermissions.set(permission.module, [...currentPermissions, permission]);
  });

  return Array.from(groupedPermissions.entries())
    .map(([module, permissions]) => ({
      module,
      permissions,
    }))
    .sort((left, right) => {
      const leftPresentation = getModulePresentation(left.module);
      const rightPresentation = getModulePresentation(right.module);
      if (leftPresentation.order !== rightPresentation.order) {
        return leftPresentation.order - rightPresentation.order;
      }
      return leftPresentation.label.localeCompare(rightPresentation.label, 'zh-Hans-CN');
    });
};

export const buildScopeGroupPermissionCodeMap = (
  permissionCatalog: PermissionCatalogItem[],
): Map<string, string[]> => {
  const groupMap = new Map<string, string[]>();

  permissionCatalog.forEach((permission) => {
    if (!permission.scope_group_key) {
      return;
    }
    const currentCodes = groupMap.get(permission.scope_group_key) ?? [];
    groupMap.set(permission.scope_group_key, [...currentCodes, permission.code]);
  });

  return groupMap;
};

export const buildScopeAwarePermissionCodeSet = (
  permissionCatalog: PermissionCatalogItem[],
): Set<string> => new Set(
  permissionCatalog
    .filter((permission) => permission.scope_aware)
    .map((permission) => permission.code),
);
