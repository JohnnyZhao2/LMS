/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AuthSessionPayload, LoginRequest, LoginResponse, SwitchRoleResponse } from '@/types/auth';
import type { CapabilityMap } from '@/types/authorization';
import type { Role, RoleCode, UserInfo } from '@/types/common';
import {
  clearStoredAuthSession,
  commitAuthSession,
  getStoredRefreshToken,
  hasStoredAuthSession,
} from '@/lib/auth-session';

interface AuthState {
  user: UserInfo | null;
  currentRole: RoleCode | null;
  availableRoles: Role[];
  capabilities: CapabilityMap;
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
  hasCapability: (permissionCode: string) => boolean;
  hasAnyCapability: (permissionCodes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const MIN_ROLE_SWITCH_DURATION_MS = 220;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const buildLoggedOutState = (): AuthState => ({
  user: null,
  currentRole: null,
  availableRoles: [],
  capabilities: {},
  isAuthenticated: false,
  isLoading: false,
  isSwitching: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeRoleSwitchRequestRef = useRef<{
    roleCode: RoleCode;
    startedAt: number;
    promise: Promise<SwitchRoleResponse>;
  } | null>(null);
  const [state, setState] = useState<AuthState>(() => {
    const hasTokens = hasStoredAuthSession();

    return {
      user: null,
      currentRole: null,
      availableRoles: [],
      capabilities: {},
      isAuthenticated: false,
      isLoading: hasTokens,
      isSwitching: false,
    };
  });

  const resetAuthState = useCallback(() => {
    clearStoredAuthSession();
    setState(buildLoggedOutState());
  }, []);

  const applyAuthSession = useCallback(
    (session: AuthSessionPayload, options?: { isSwitching?: boolean }) => {
      setState((prev) => ({
        ...prev,
        user: session.user,
        currentRole: session.current_role,
        availableRoles: session.available_roles,
        capabilities: session.capabilities,
        isAuthenticated: true,
        isLoading: false,
        isSwitching: options?.isSwitching ?? prev.isSwitching,
      }));
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    if (!hasStoredAuthSession()) {
      setState(buildLoggedOutState());
      return;
    }

    try {
      const response = await apiClient.get<AuthSessionPayload>('/auth/me/');
      applyAuthSession(response, { isSwitching: false });
    } catch {
      resetAuthState();
    }
  }, [applyAuthSession, resetAuthState]);

  const completeLogin = useCallback((response: LoginResponse) => {
    commitAuthSession(response);
    applyAuthSession(response, { isSwitching: false });
    return response.current_role;
  }, [applyAuthSession]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await apiClient.post<LoginResponse>('/auth/login/', data, { skipAuth: true });
    return completeLogin(response);
  }, [completeLogin]);

  const loginByOidcCode = useCallback(async (code: string) => {
    const response = await apiClient.post<LoginResponse>(
      '/auth/oidc/code-login/',
      { code },
      { skipAuth: true },
    );
    return completeLogin(response);
  }, [completeLogin]);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout/', { refresh_token: refreshToken });
      } catch {
        void 0;
      }
    }
    resetAuthState();
  }, [resetAuthState]);

  const switchRole = useCallback(async (roleCode: RoleCode) => {
    setState((prev) => ({ ...prev, isSwitching: true }));

    const existingRequest = activeRoleSwitchRequestRef.current;
    const sharedRequest = existingRequest && existingRequest.roleCode === roleCode
      ? existingRequest
      : (() => {
          const request = {
            roleCode,
            startedAt: Date.now(),
            promise: apiClient.post<SwitchRoleResponse>('/auth/switch-role/', { role_code: roleCode }),
          };
          activeRoleSwitchRequestRef.current = request;
          return request;
        })();

    try {
      const response = await sharedRequest.promise;
      const elapsed = Date.now() - sharedRequest.startedAt;
      if (elapsed < MIN_ROLE_SWITCH_DURATION_MS) {
        await sleep(MIN_ROLE_SWITCH_DURATION_MS - elapsed);
      }
      commitAuthSession(response);
      applyAuthSession(response, { isSwitching: false });
    } catch (error) {
      const elapsed = Date.now() - sharedRequest.startedAt;
      if (elapsed < MIN_ROLE_SWITCH_DURATION_MS) {
        await sleep(MIN_ROLE_SWITCH_DURATION_MS - elapsed);
      }
      setState((prev) => ({ ...prev, isSwitching: false }));
      throw error;
    } finally {
      if (activeRoleSwitchRequestRef.current?.promise === sharedRequest.promise) {
        activeRoleSwitchRequestRef.current = null;
      }
    }
  }, [applyAuthSession]);

  const hasCapability = useCallback((permissionCode: string) => {
    if (!permissionCode) {
      return false;
    }
    return !!state.capabilities[permissionCode]?.allowed;
  }, [state.capabilities]);

  const hasAnyCapability = useCallback((permissionCodes: string[]) => {
    if (!permissionCodes.length) {
      return false;
    }
    return permissionCodes.some((permissionCode) => !!state.capabilities[permissionCode]?.allowed);
  }, [state.capabilities]);

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
    hasCapability,
    hasAnyCapability,
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
