import type { ReactNode } from 'react';
import { LayoutGrid } from 'lucide-react';
import type { Workbench } from '@/types/common';
import {
  BUSINESS_ROUTE_META,
  type MenuMeta,
} from './route-registry';

export interface MenuItem {
  key: string;
  icon?: ReactNode;
  label: string;
  children?: MenuItem[];
}

export const getMenuItemsBySection = (
  workbench: Workbench,
  hasCapability: (permissionCode: string) => boolean,
): MenuItem[] => {
  const items: Array<MenuItem & { order: number; group?: MenuMeta['group'] }> = [
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
    if (route.requiredPermissions?.length && !(
      route.permissionMode === 'any'
        ? route.requiredPermissions.some(hasCapability)
        : route.requiredPermissions.every(hasCapability)
    )) {
      return;
    }

    items.push({
      key: `/${route.path}`,
      icon: route.menu.icon ? <route.menu.icon className="h-4 w-4" /> : undefined,
      label: typeof route.menu.label === 'function'
        ? route.menu.label(workbench)
        : route.menu.label,
      order: route.menu.order,
      group: route.menu.group,
    });
  });

  const groupItems = Object.values(items.reduce<Record<string, typeof items>>((groups, item) => {
    if (item.group) {
      (groups[item.group.key] ??= []).push(item);
    }
    return groups;
  }, {})).map((children) => {
    const group = children[0].group!;
    return {
      key: `/${group.key}`,
      icon: <group.icon className="h-4 w-4" />,
      label: group.label,
      order: group.order,
      children: children
        .sort((left, right) => left.order - right.order)
        .map(({ key, icon, label, children: nestedChildren }) => ({
          key,
          icon,
          label,
          children: nestedChildren,
        })),
    };
  });

  return [...items.filter((item) => !item.group), ...groupItems]
    .sort((left, right) => left.order - right.order)
    .map(({ key, icon, label, children }) => ({ key, icon, label, children }));
};
