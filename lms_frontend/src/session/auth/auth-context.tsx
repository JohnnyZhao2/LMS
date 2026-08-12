/* eslint-disable react-refresh/only-export-components */
/**
 * 登录态上下文。
 *
 * 权限来自 capabilities；工作台只是前端导航，不换 token。
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import type {
  AuthSessionPayload,
  ChangeOwnPasswordRequest,
  ChangeOwnPasswordResponse,
  LoginRequest,
  LoginResponse,
} from '@/types/auth';
import type { CapabilityCodes } from '@/types/authorization';
import type { Role, RoleCode, UserInfo } from '@/types/common';
import { tokenStorage } from '@/lib/token-storage';
import { MANAGEMENT_ROLE_CODES } from '@/entities/authorization/constants/access';

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
  hasAnyCapability: (permissionCodes: string[]) => boolean;
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
    setState(buildLoggedOutState());
  }, []);

  const applyAuthSession = useCallback((session: AuthSessionPayload) => {
    setState({
      user: session.user,
      roles: session.roles ?? [],
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

  const hasAnyCapability = useCallback((permissionCodes: string[]) => {
    if (!permissionCodes.length) {
      return false;
    }
    return permissionCodes.some((permissionCode) => state.capabilities.includes(permissionCode));
  }, [state.capabilities]);

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
    MANAGEMENT_ROLE_CODES.includes(role.code)
  ))?.code ?? null;
  const canAccessManage = Boolean(state.user?.is_superuser || managementRole);

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
