import { LayoutGrid } from 'lucide-react';
import type { Workbench } from '@/types/common';
import {
  BUSINESS_ROUTE_META,
  type BusinessRouteMeta,
  type MenuItem,
  type MenuLabelResolver,
  type OrderedMenuItem,
} from './route-registry';

const resolveMenuLabel = (
  label: MenuLabelResolver,
  workbench: Workbench,
): string => (typeof label === 'function' ? label(workbench) : label);

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
  workbench: Workbench,
  hasCapability: (permissionCode: string) => boolean,
  hasAnyCapability: (permissionCodes: string[]) => boolean,
): MenuItem[] => {
  const items: Array<MenuItem & { order: number; group?: string }> = [
    {
      key: '/dashboard',
      icon: <LayoutGrid className="h-4 w-4" />,
      label: '概览',
      order: 0,
    },
  ];

  BUSINESS_ROUTE_META.forEach((route) => {
    if (!route.menu) {
      return;
    }
    if (!(route.workbenches ?? ['manage']).includes(workbench)) {
      return;
    }
    if (!isPermissionGranted(route, hasCapability, hasAnyCapability)) {
      return;
    }

    items.push({
      key: `/${route.path}`,
      icon: route.menu.icon ? <route.menu.icon className="h-4 w-4" /> : undefined,
      label: resolveMenuLabel(route.menu.label, workbench),
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
          key: `/${groupKey}`,
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
