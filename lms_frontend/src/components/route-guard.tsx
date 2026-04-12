import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/features/auth/stores/auth-context';
import type { RoleCode } from '@/types/common';
import { showApiError } from '@/utils/error-handler';
import {
  getAccessibleWorkspaceHome,
  getWorkspaceHome,
  normalizeRoleCode,
} from '@/app/workspace-config';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleCode[];
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
}

const RouteLoadingState = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
);

const resolveFallbackRole = (
  availableRoles: Array<{ code: RoleCode }>,
  currentRole: RoleCode | null,
) => {
  if (currentRole && availableRoles.some((item) => item.code === currentRole)) {
    return currentRole;
  }

  return availableRoles[0]?.code ?? null;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermissions,
  permissionMode = 'all',
}) => {
  const {
    isAuthenticated,
    isLoading,
    availableRoles,
    currentRole,
    hasAnyCapability,
    hasCapability,
  } = useAuth();
  const { role: urlRole } = useParams<{ role: string }>();
  const normalizedUrlRole = normalizeRoleCode(urlRole);

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (allowedRoles?.length && (!normalizedUrlRole || !allowedRoles.includes(normalizedUrlRole))) {
    const fallbackPath = getAccessibleWorkspaceHome(
      availableRoles.map((item) => item.code),
      currentRole,
    ) ?? ROUTES.LOGIN;
    return <Navigate to={fallbackPath} replace />;
  }

  const hasRequiredPermissions = !requiredPermissions || requiredPermissions.length === 0
    ? true
    : permissionMode === 'any'
      ? hasAnyCapability(requiredPermissions)
      : requiredPermissions.every((permissionCode) => hasCapability(permissionCode));

  if (!hasRequiredPermissions) {
    const fallbackPath = getAccessibleWorkspaceHome(
      availableRoles.map((item) => item.code),
      normalizedUrlRole ?? currentRole,
    ) ?? ROUTES.LOGIN;
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export const RoleRouteWrapper: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    availableRoles,
    currentRole,
    isSwitching,
    switchRole,
  } = useAuth();
  const [failedRoleSync, setFailedRoleSync] = useState<RoleCode | null>(null);

  const roleCode = normalizeRoleCode(role);
  const isValidRole = roleCode !== null;
  const hasRole = availableRoles.some((item) => item.code === roleCode);
  const fallbackRole = resolveFallbackRole(availableRoles, currentRole);
  const fallbackPath = fallbackRole ? getWorkspaceHome(fallbackRole) ?? ROUTES.LOGIN : ROUTES.LOGIN;
  const shouldSyncRole = Boolean(
    isAuthenticated &&
    !isLoading &&
    isValidRole &&
    hasRole &&
    currentRole &&
    currentRole !== roleCode,
  );

  useEffect(() => {
    if (!shouldSyncRole || !roleCode || isSwitching || failedRoleSync === roleCode) {
      return;
    }

    void switchRole(roleCode).catch((error) => {
      showApiError(error, '角色切换失败');
      setFailedRoleSync(roleCode);
    });
  }, [failedRoleSync, isSwitching, roleCode, shouldSyncRole, switchRole]);

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (shouldSyncRole || isSwitching) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!isValidRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (!hasRole) {
    if (fallbackPath === location.pathname) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return <Navigate to={fallbackPath} replace />;
  }

  if (failedRoleSync === roleCode) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};
