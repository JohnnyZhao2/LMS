/* eslint-disable react-refresh/only-export-components */
import { Navigate, Route, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/route-guard';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/stores/auth-context';
import {
  BUSINESS_ROUTE_META,
  getBusinessRouteElement,
  getWorkspaceDashboardElement,
  resolveWorkspaceRouteByRole,
} from '../app-route-meta';
import {
  getAccessibleWorkspaceHome,
  normalizeRoleCode,
} from '../workspace-config';

const Dashboard = () => {
  const { role } = useParams<{ role: string }>();
  const { availableRoles } = useAuth();
  const routeRole = normalizeRoleCode(role);
  const fallbackPath = getAccessibleWorkspaceHome(
    availableRoles.map((item) => item.code),
    routeRole,
  ) ?? ROUTES.LOGIN;

  if (!routeRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  const hasRole = availableRoles.some((item) => item.code === routeRole);
  if (!hasRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  const workspaceRoute = resolveWorkspaceRouteByRole(routeRole);
  if (!workspaceRoute) {
    return <Navigate to={fallbackPath} replace />;
  }

  return getWorkspaceDashboardElement(workspaceRoute.dashboardVariant);
};

export const roleRoutes = [
  <Route key="dashboard" path="dashboard" element={<Dashboard />} />,
  <Route key="dashboard-index" index element={<Dashboard />} />,
  ...BUSINESS_ROUTE_META.map((route) => (
    <Route
      key={route.key}
      path={route.path}
      element={(
        <ProtectedRoute
          allowedRoles={route.allowedRoles}
          requiredPermissions={route.requiredPermissions}
          permissionMode={route.permissionMode}
        >
          {getBusinessRouteElement(route)}
        </ProtectedRoute>
      )}
    />
  )),
];
