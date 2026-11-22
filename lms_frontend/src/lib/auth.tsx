/* eslint-disable react-refresh/only-export-components */
/**
 * 登录态上下文。
 *
 * 权限来自 capabilities；工作台只是前端导航，不换 token。
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { setWorkbench } from '@/lib/workbench-store';
import type {
  AuthSessionPayload,
  CapabilityCodes,
  ChangeOwnPasswordRequest,
  ChangeOwnPasswordResponse,
  LoginRequest,
  LoginResponse,
} from '@/types/auth';
import type { Role, RoleCode, UserInfo } from '@/types/common';
import { tokenStorage } from '@/lib/token-storage';
import { isBuiltinPrimaryRole } from '@/lib/user-role-assignment';

interface AuthState {
  user: UserInfo | null;
  roles: Role[];
  capabilities: CapabilityCodes;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  managementRole: RoleCode | null;
  canAccessManage: boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginByOneAccountCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  changeOwnPassword: (data: ChangeOwnPasswordRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasCapability: (permissionCode: string) => boolean;
  hasFullScopeCapability: (permissionCode: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const buildLoggedOutState = (): AuthState => ({
  user: null,
  roles: [],
  capabilities: [],
  isAuthenticated: false,
  isLoading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const hasTokens = Boolean(tokenStorage.getAccessToken() || tokenStorage.getRefreshToken());

    return {
      user: null,
      roles: [],
      capabilities: [],
      isAuthenticated: false,
      isLoading: hasTokens,
    };
  });

  const resetAuthState = useCallback(() => {
    tokenStorage.clearTokens();
    setWorkbench('learn');
    queryClient.clear();
    setState(buildLoggedOutState());
  }, []);

  const applyAuthSession = useCallback((session: AuthSessionPayload) => {
    const nextRoles = session.roles ?? [];
    if (!session.user?.is_superuser && nextRoles.length === 0) {
      setWorkbench('learn');
    }
    setState({
      user: session.user,
      roles: nextRoles,
      capabilities: session.capabilities ?? [],
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
      setState(buildLoggedOutState());
      return;
    }

    try {
      const response = await apiClient.get<AuthSessionPayload>('/auth/me/');
      applyAuthSession(response);
    } catch (error) {
      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        setState(buildLoggedOutState());
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        resetAuthState();
        return;
      }
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [applyAuthSession, resetAuthState]);

  const completeLogin = useCallback((response: LoginResponse) => {
    setWorkbench('learn');
    queryClient.clear();
    tokenStorage.setTokenPair(response);
    applyAuthSession(response);
  }, [applyAuthSession]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await apiClient.post<LoginResponse>('/auth/login/', data, { skipAuth: true });
    completeLogin(response);
  }, [completeLogin]);

  const loginByOneAccountCode = useCallback(async (code: string) => {
    const response = await apiClient.post<LoginResponse>(
      '/auth/one-account/code-login/',
      { code },
      { skipAuth: true },
    );
    completeLogin(response);
  }, [completeLogin]);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    await apiClient.post('/auth/logout/', { refresh_token: refreshToken });
    resetAuthState();
  }, [resetAuthState]);

  const changeOwnPassword = useCallback(async (data: ChangeOwnPasswordRequest) => {
    const response = await apiClient.post<ChangeOwnPasswordResponse>('/auth/me/password/', data);
    tokenStorage.setTokenPair(response);
    applyAuthSession(response);
  }, [applyAuthSession]);

  const hasCapability = useCallback((permissionCode: string) => {
    if (!permissionCode) {
      return false;
    }
    return state.capabilities.includes(permissionCode);
  }, [state.capabilities]);

  const hasFullScopeCapability = useCallback((permissionCode: string) => {
    if (!permissionCode) {
      return false;
    }
    if (state.user?.is_superuser) {
      return true;
    }
    if (!state.capabilities.includes(permissionCode)) {
      return false;
    }
    return state.roles.some((role) => (
      role.data_scope === 'ALL'
      && (role.permission_codes ? role.permission_codes.includes(permissionCode) : role.code === 'ADMIN')
    ));
  }, [state.capabilities, state.roles, state.user?.is_superuser]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    const syncIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser();
      }
    };

    document.addEventListener('visibilitychange', syncIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', syncIfVisible);
    };
  }, [refreshUser, state.isAuthenticated]);

  const managementRole = state.roles.find((role) => (
    isBuiltinPrimaryRole(role.code)
  ))?.code ?? null;
  const canAccessManage = Boolean(state.user?.is_superuser || state.roles.length > 0);

  const value: AuthContextValue = {
    ...state,
    managementRole,
    canAccessManage,
    login,
    loginByOneAccountCode,
    logout,
    changeOwnPassword,
    refreshUser,
    hasCapability,
    hasFullScopeCapability,
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
