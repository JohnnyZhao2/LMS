import { getModulePresentation } from '@/entities/authorization/constants/permission-presentation';
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
