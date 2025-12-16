/**
 * Authentication Context
 * Provides authentication state and methods to child components
 * Requirements: 1.2
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from './api/auth';
import { tokenStorage } from '@/lib/api';
import type { User, Role, RoleCode } from '@/types/domain';
import type { LoginRequest } from '@/types/api';

/**
 * Auth context value interface
 */
interface AuthContextValue {
  // State
  user: User | null;
  currentRole: RoleCode | null;
  availableRoles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (roleCode: RoleCode) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the application and provides authentication context
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Get state and actions from Zustand store
  const {
    user,
    currentRole,
    availableRoles,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    switchRole: storeSwitchRole,
    initialize,
  } = useAuthStore();

  /**
   * Initialize auth state from localStorage on mount
   * Requirements: 1.2 - Restore session from stored tokens
   */
  useEffect(() => {
    initialize();
    setIsInitialized(true);
  }, [initialize]);

  /**
   * Login handler
   * Requirements: 1.2 - Call login API and store JWT tokens
   */
  const login = useCallback(
    async (credentials: LoginRequest) => {
      await storeLogin(credentials);
    },
    [storeLogin]
  );

  /**
   * Logout handler
   * Requirements: 1.5 - Clear local tokens and call logout API
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        // Try to invalidate tokens on server
        await authApi.logout({ refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors - we'll clear local state anyway
    } finally {
      storeLogout();
    }
  }, [storeLogout]);

  /**
   * Switch role handler
   * Requirements: 2.3 - Call role switch API and update tokens
   */
  const switchRole = useCallback(
    async (roleCode: RoleCode) => {
      await storeSwitchRole(roleCode);
    },
    [storeSwitchRole]
  );

  const value: AuthContextValue = {
    user,
    currentRole,
    availableRoles,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
