import { LayoutGrid } from 'lucide-react';
import type { RoleCode } from '@/types/common';
import { getRolePathPrefix } from '@/session/workspace/role-paths';
import { BUSINESS_ROUTE_META, type BusinessRouteMeta, type MenuItem, type MenuLabelResolver, type OrderedMenuItem } from './route-registry';
import { getWorkspaceConfig, type WorkspaceConfig } from './workspace-config';

const resolveMenuLabel = (
  label: MenuLabelResolver,
  workspace: WorkspaceConfig,
  role: RoleCode,
): string => (typeof label === 'function' ? label(workspace, role) : label);

const isPermissionGranted = (
  route: BusinessRouteMeta,
  hasCapability: (permissionCode: string) => boolean,
  hasAnyCapability: (permissionCodes: string[]) => boolean,
): boolean => {
  if (!route.requiredPermissions?.length) {
    return true;
  }

  return route.permissionMode === 'any'
    ? hasAnyCapability(route.requiredPermissions)
    : route.requiredPermissions.every((permissionCode) => hasCapability(permissionCode));
};

export const getMenuItemsBySection = (
  role: RoleCode | null,
  hasCapability: (permissionCode: string) => boolean,
  hasAnyCapability: (permissionCodes: string[]) => boolean,
): MenuItem[] => {
  if (!role) {
    return [];
  }

  const workspace = getWorkspaceConfig(role);
  if (!workspace) {
    return [];
  }

  const rolePrefix = getRolePathPrefix(role);
  if (!rolePrefix) {
    return [];
  }

  const items: Array<MenuItem & { order: number; group?: string }> = [
    {
      key: `${rolePrefix}/dashboard`,
      icon: <LayoutGrid className="h-4 w-4" />,
      label: '概览',
      order: 0,
    },
  ];

  BUSINESS_ROUTE_META.forEach((route) => {
    if (!route.showInMenu || !route.menu) {
      return;
    }
    if (route.allowedRoles && !route.allowedRoles.includes(role)) {
      return;
    }
    if (!isPermissionGranted(route, hasCapability, hasAnyCapability)) {
      return;
    }

    items.push({
      key: `${rolePrefix}/${route.path}`,
      icon: route.menu.icon ? <route.menu.icon className="h-4 w-4" /> : undefined,
      label: resolveMenuLabel(route.menu.label, workspace, role),
      order: route.menu.order,
      group: route.menu.group?.key,
    });
  });

  const directItems: OrderedMenuItem[] = items
    .filter((item) => !item.group)
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      order: item.order,
      item: {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children,
      },
    }));

  const groupedLeafItems = items.filter(
    (item): item is MenuItem & { order: number; group: string } => typeof item.group === 'string',
  );

  const groupedItems = groupedLeafItems.reduce<Record<string, Array<MenuItem & { order: number; group: string }>>>(
    (result, item) => {
      if (!result[item.group]) {
        result[item.group] = [];
      }
      result[item.group].push(item);
      return result;
    },
    {},
  );

  const groupItems = Object.entries(groupedItems).reduce<OrderedMenuItem[]>(
    (result, [groupKey, groupChildren]) => {
      const groupMeta = BUSINESS_ROUTE_META.find(
        (route) => route.menu?.group?.key === groupKey,
      )?.menu?.group;
      if (!groupMeta) {
        return result;
      }

      result.push({
        order: groupMeta.order,
        item: {
          key: `${rolePrefix}/${groupKey}`,
          icon: <groupMeta.icon className="h-4 w-4" />,
          label: groupMeta.label,
          children: groupChildren
            .sort((left, right) => left.order - right.order)
            .map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              children: item.children,
            })),
        },
      });
      return result;
    },
    [],
  );

  return [...directItems, ...groupItems]
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
};
