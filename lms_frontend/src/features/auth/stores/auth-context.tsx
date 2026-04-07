/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '@/lib/token-storage';
import type { AuthSessionPayload, LoginRequest, Role, RoleCode, SwitchRoleResponse, UserInfo } from '@/types/api';
import { loginApi } from '../api/login';
import { logoutApi } from '../api/logout';
import { switchRoleApi } from '../api/switch-role';
import { meApi } from '../api/get-me';
import { oidcApi } from '../api/oidc';

export interface AuthState {
  user: UserInfo | null;
  currentRole: RoleCode | null;
  availableRoles: Role[];
  effectivePermissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isSwitching: boolean;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<RoleCode>;
  loginByOidcCode: (code: string) => Promise<RoleCode>;
  logout: () => Promise<void>;
  switchRole: (roleCode: RoleCode) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const MIN_ROLE_SWITCH_DURATION_MS = 220;
let activeRoleSwitchRequest: {
  roleCode: RoleCode;
  startedAt: number;
  promise: Promise<SwitchRoleResponse>;
} | null = null;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const buildLoggedOutState = (): AuthState => ({
  user: null,
  currentRole: null,
  availableRoles: [],
  effectivePermissions: [],
  isAuthenticated: false,
  isLoading: false,
  isSwitching: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const user = tokenStorage.getUserInfo();
    const currentRole = tokenStorage.getCurrentRole();
    const availableRoles = tokenStorage.getAvailableRoles();
    const effectivePermissions = tokenStorage.getEffectivePermissions();
    const hasTokens = tokenStorage.hasTokens();

    const isAuthenticated = hasTokens && !!user;

    return {
      user,
      currentRole,
      availableRoles,
      effectivePermissions,
      isAuthenticated,
      isLoading: hasTokens,
      isSwitching: false,
    };
  });

  const resetAuthState = useCallback(() => {
    tokenStorage.clearAll();
    setState(buildLoggedOutState());
  }, []);

  const applyAuthSession = useCallback(
    (session: AuthSessionPayload, options?: { isSwitching?: boolean }) => {
      tokenStorage.setAuthSession(session);

      setState((prev) => ({
        ...prev,
        user: session.user,
        currentRole: session.current_role,
        availableRoles: session.available_roles,
        effectivePermissions: session.effective_permissions,
        isAuthenticated: true,
        isLoading: false,
        isSwitching: options?.isSwitching ?? prev.isSwitching,
      }));
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.hasTokens()) {
      setState(buildLoggedOutState());
      return;
    }

    try {
      const response = await meApi.getMe();
      applyAuthSession(response, { isSwitching: false });
    } catch {
      resetAuthState();
    }
  }, [applyAuthSession, resetAuthState]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await loginApi.login(data);
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    applyAuthSession(response, { isSwitching: false });
    return response.current_role;
  }, [applyAuthSession]);


  const loginByOidcCode = useCallback(async (code: string) => {
    const response = await oidcApi.codeLogin({ code });
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    applyAuthSession(response, { isSwitching: false });
    return response.current_role;
  }, [applyAuthSession]);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi.logout({ refresh_token: refreshToken });
      } catch {}
    }
    resetAuthState();
  }, [resetAuthState]);

  const switchRole = useCallback(async (roleCode: RoleCode) => {
    setState((prev) => ({ ...prev, isSwitching: true }));

    const sharedRequest = activeRoleSwitchRequest?.roleCode === roleCode
      ? activeRoleSwitchRequest
      : (() => {
          const request = {
            roleCode,
            startedAt: Date.now(),
            promise: switchRoleApi.switchRole({ role_code: roleCode }),
          };
          activeRoleSwitchRequest = request;
          return request;
        })();

    try {
      const response = await sharedRequest.promise;
      const elapsed = Date.now() - sharedRequest.startedAt;
      if (elapsed < MIN_ROLE_SWITCH_DURATION_MS) {
        await sleep(MIN_ROLE_SWITCH_DURATION_MS - elapsed);
      }
      tokenStorage.setTokens(response.access_token, response.refresh_token);
      applyAuthSession(response, { isSwitching: false });
    } catch (error) {
      const elapsed = Date.now() - sharedRequest.startedAt;
      if (elapsed < MIN_ROLE_SWITCH_DURATION_MS) {
        await sleep(MIN_ROLE_SWITCH_DURATION_MS - elapsed);
      }
      setState((prev) => ({ ...prev, isSwitching: false }));
      throw error;
    } finally {
      if (activeRoleSwitchRequest?.promise === sharedRequest.promise) {
        activeRoleSwitchRequest = null;
      }
    }
  }, [applyAuthSession]);

  const hasPermission = useCallback((permissionCode: string) => {
    if (!permissionCode) {
      return false;
    }
    if (state.currentRole === 'SUPER_ADMIN' || state.user?.is_superuser) {
      return true;
    }
    return state.effectivePermissions.includes(permissionCode);
  }, [state.currentRole, state.effectivePermissions, state.user?.is_superuser]);

  const hasAnyPermission = useCallback((permissionCodes: string[]) => {
    if (!permissionCodes.length) {
      return false;
    }
    if (state.currentRole === 'SUPER_ADMIN' || state.user?.is_superuser) {
      return true;
    }
    return permissionCodes.some((permissionCode) => state.effectivePermissions.includes(permissionCode));
  }, [state.currentRole, state.effectivePermissions, state.user?.is_superuser]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    const syncSession = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser();
      }
    };

    window.addEventListener('focus', syncSession);
    document.addEventListener('visibilitychange', syncSession);

    return () => {
      window.removeEventListener('focus', syncSession);
      document.removeEventListener('visibilitychange', syncSession);
    };
  }, [refreshUser, state.isAuthenticated]);

  const value: AuthContextValue = {
    ...state,
    login,
    loginByOidcCode,
    logout,
    switchRole,
    refreshUser,
    hasPermission,
    hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
