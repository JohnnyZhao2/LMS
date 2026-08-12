import { matchPath } from 'react-router-dom';

import { BUSINESS_ROUTE_META } from '@/app/route-registry';
import type { Workbench } from '@/types/common';

export const matchBusinessRoute = (pathname: string) => (
  BUSINESS_ROUTE_META.find((route) => matchPath({ path: `/${route.path}`, end: true }, pathname)) ?? null
);

export const routeAllowsWorkbench = (pathname: string, workbench: Workbench): boolean => {
  if (pathname === '/dashboard' || pathname === '/403') {
    return true;
  }
  const route = matchBusinessRoute(pathname);
  if (!route) {
    return false;
  }
  return (route.workbenches ?? ['manage']).includes(workbench);
};
