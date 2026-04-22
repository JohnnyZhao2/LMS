import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS,
  USER_PERMISSION_VIEW_PERMISSION,
} from '@/entities/authorization/constants/access';
import { getMenuItemsBySection } from './menu-builder';
import { BUSINESS_ROUTE_META, type MenuItem } from './route-registry';

const collectMenuLabels = (items: MenuItem[]): string[] => items.flatMap((item) => [
  item.label,
  ...(item.children ? collectMenuLabels(item.children) : []),
]);

const collectMenuKeys = (items: MenuItem[]): string[] => items.flatMap((item) => [
  item.key ?? '',
  ...(item.children ? collectMenuKeys(item.children) : []),
]).filter(Boolean);

describe('menu-builder', () => {
  it('授予用户授权权限时显示用户授权菜单', () => {
    const grantedCodes = new Set([USER_PERMISSION_VIEW_PERMISSION]);
    const hasCapability = vi.fn((permissionCode: string) => grantedCodes.has(permissionCode));
    const hasAnyCapability = vi.fn((permissionCodes: string[]) => (
      permissionCodes.some((permissionCode) => grantedCodes.has(permissionCode))
    ));

    const menuItems = getMenuItemsBySection('ADMIN', hasCapability, hasAnyCapability);

    expect(collectMenuLabels(menuItems)).toContain('用户授权');
  });

  it('用户授权菜单入口复用授权工作台权限集合', () => {
    const authorizationRoute = BUSINESS_ROUTE_META.find((route) => route.key === 'authorization-center');

    expect(authorizationRoute?.requiredPermissions).toEqual(AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS);
    expect(authorizationRoute?.permissionMode).toBe('any');
  });

  it('菜单路由按自身权限声明显示入口', () => {
    BUSINESS_ROUTE_META
      .filter((route) => route.showInMenu && route.menu)
      .forEach((route) => {
        const permissionSets = route.permissionMode === 'any'
          ? (route.requiredPermissions ?? []).map((permissionCode) => [permissionCode])
          : [route.requiredPermissions ?? []];

        permissionSets.forEach((grantedPermissions) => {
          const grantedCodes = new Set(grantedPermissions);
          const hasCapability = vi.fn((permissionCode: string) => grantedCodes.has(permissionCode));
          const hasAnyCapability = vi.fn((permissionCodes: string[]) => (
            permissionCodes.some((permissionCode) => grantedCodes.has(permissionCode))
          ));

          const menuItems = getMenuItemsBySection('ADMIN', hasCapability, hasAnyCapability);

          expect(collectMenuKeys(menuItems)).toContain(`/admin/${route.path}`);
        });
      });
  });
});
