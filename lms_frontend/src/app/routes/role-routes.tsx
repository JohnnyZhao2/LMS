/* eslint-disable react-refresh/only-export-components */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/app/guards/route-guard';
import { useAuth } from '@/session/auth/auth-context';
import { useWorkbench } from '@/session/hooks/use-workbench';
import {
  BUSINESS_ROUTE_META,
  getBusinessRouteElement,
  getDashboardElement,
} from '../route-registry';
import { getDashboardVariant } from '../workspace-config';

const Dashboard = () => {
  const { managementRole, user } = useAuth();
  const workbench = useWorkbench();
  return getDashboardElement(getDashboardVariant(
    workbench,
    managementRole,
    Boolean(user?.is_superuser),
  ));
};

export const roleRoutes = [
  <Route key="dashboard" path="dashboard" element={<Dashboard />} />,
  ...BUSINESS_ROUTE_META.map((route) => (
    <Route
      key={route.key}
      path={route.path}
      element={(
        <ProtectedRoute
          requiredPermissions={route.requiredPermissions}
          permissionMode={route.permissionMode}
        >
          {getBusinessRouteElement(route)}
        </ProtectedRoute>
      )}
    />
  )),
];
