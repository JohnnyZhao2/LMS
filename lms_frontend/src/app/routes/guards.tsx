/**
 * Route Guards
 * Components for protecting routes based on authentication and role
 * Requirements: 3.6
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { type RoleCode, ROLE_DEFAULT_ROUTES, ROLE_CODES } from '@/config/roles';

interface ProtectedRouteProps {
  children: ReactNode;
}

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: RoleCode[];
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * Checks if user is authenticated, redirects to login if not
 * Requirements: 3.6 - Redirect unauthenticated users to login
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  // Wait for auth to initialize before redirecting
  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * RoleGuard Component
 * Checks if user has required role, redirects to forbidden or default route if not
 * Requirements: 3.6 - Redirect unauthorized users to 403 or appropriate page
 */
export function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const { user, currentRole } = useAuth();
  const location = useLocation();

  // If no user, let ProtectedRoute handle it
  if (!user) {
    return null;
  }

  // Use currentRole from auth context if available, otherwise map from user.role
  const effectiveRole = currentRole || mapLegacyRole((user as { role?: string }).role || '');

  // Check if user's current role is in allowed roles
  const hasAccess = allowedRoles.includes(effectiveRole);

  if (!hasAccess) {
    // Determine redirect destination
    const destination = redirectTo || getRedirectForRole(effectiveRole) || '/forbidden';
    
    // Avoid redirect loops
    if (location.pathname === destination) {
      return <>{children}</>;
    }

    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}

/**
 * Map legacy role names to new RoleCode format
 * Handles backward compatibility with existing auth system
 */
function mapLegacyRole(role: string): RoleCode {
  const roleMap: Record<string, RoleCode> = {
    'STUDENT': ROLE_CODES.STUDENT,
    'MENTOR': ROLE_CODES.MENTOR,
    'MANAGER': ROLE_CODES.DEPT_MANAGER,
    'DEPT_MANAGER': ROLE_CODES.DEPT_MANAGER,
    'ADMIN': ROLE_CODES.ADMIN,
    'TEAM_LEADER': ROLE_CODES.TEAM_MANAGER,
    'TEAM_MANAGER': ROLE_CODES.TEAM_MANAGER,
  };

  return roleMap[role] || ROLE_CODES.STUDENT;
}

/**
 * Get default redirect route for a role
 * Used when user tries to access unauthorized route
 */
function getRedirectForRole(role: RoleCode): string {
  return ROLE_DEFAULT_ROUTES[role] || '/dashboard';
}

/**
 * Hook to check if current user has access to a specific role
 */
export function useHasRole(allowedRoles: RoleCode[]): boolean {
  const { user, currentRole } = useAuth();
  
  if (!user) {
    return false;
  }

  const effectiveRole = currentRole || mapLegacyRole((user as { role?: string }).role || '');
  return allowedRoles.includes(effectiveRole);
}

/**
 * Hook to get current user's mapped role code
 */
export function useCurrentRoleCode(): RoleCode | null {
  const { user, currentRole } = useAuth();
  
  if (!user) {
    return null;
  }

  return currentRole || mapLegacyRole((user as { role?: string }).role || '');
}

export default { ProtectedRoute, RoleGuard };
