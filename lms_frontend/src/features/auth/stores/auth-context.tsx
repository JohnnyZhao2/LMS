/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '@/lib/token-storage';
import type { AuthSessionPayload, LoginRequest, Role, RoleCode, UserInfo } from '@/types/api';
import { loginApi } from '../api/login';
import { logoutApi } from '../api/logout';
import { switchRoleApi } from '../api/switch-role';
import { meApi } from '../api/get-me';

export interface AuthState {
  user: UserInfo | null;
  currentRole: RoleCode | null;
  availableRoles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isSwitching: boolean;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<RoleCode>;
  logout: () => Promise<void>;
  switchRole: (roleCode: RoleCode) => Promise<void>;
  setCurrentRole: (roleCode: RoleCode) => void;
  refreshUser: () => Promise<void>;
  setIsSwitching: (isSwitching: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const buildLoggedOutState = (): AuthState => ({
  user: null,
  currentRole: null,
  availableRoles: [],
  isAuthenticated: false,
  isLoading: false,
  isSwitching: false,
});

/**
 * 认证 Provider
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const user = tokenStorage.getUserInfo();
    const currentRole = tokenStorage.getCurrentRole();
    const availableRoles = tokenStorage.getAvailableRoles();
    const hasTokens = tokenStorage.hasTokens();

    const isAuthenticated = hasTokens && !!user;

    return { user, currentRole, availableRoles, isAuthenticated, isLoading: hasTokens && !isAuthenticated, isSwitching: false };
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
        isAuthenticated: true,
        isLoading: false,
        isSwitching: options?.isSwitching ?? prev.isSwitching,
      }));
    },
    [],
  );

  /**
   * 从服务器获取最新用户信息并更新本地存储
   */
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

  /**
   * 登录
   */
  const login = useCallback(async (data: LoginRequest) => {
    const response = await loginApi.login(data);
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    applyAuthSession(response, { isSwitching: false });
    return response.current_role;
  }, [applyAuthSession]);

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi.logout({ refresh_token: refreshToken });
      } catch {
        // 忽略登出错误
      }
    }
    resetAuthState();
  }, [resetAuthState]);

  /**
   * 切换角色
   */
  const switchRole = useCallback(async (roleCode: RoleCode) => {
    setState((prev) => ({ ...prev, isSwitching: true }));
    try {
      const response = await switchRoleApi.switchRole({ role_code: roleCode });
      tokenStorage.setTokens(response.access_token, response.refresh_token);
      applyAuthSession(response, { isSwitching: true }); // 由 Header 导航后再 setIsSwitching(false)
    } catch (error) {
      setState((prev) => ({ ...prev, isSwitching: false }));
      throw error;
    }
  }, [applyAuthSession]);

  /**
   * 本地同步当前角色（不触发后端切换，仅用于路由角色上下文）
   */
  const setCurrentRole = useCallback((roleCode: RoleCode) => {
    setState((prev) => {
      if (!prev.isAuthenticated) {
        return prev;
      }
      const hasRole = prev.availableRoles.some((role) => role.code === roleCode);
      if (!hasRole) {
        return prev;
      }
      tokenStorage.setCurrentRole(roleCode);
      return {
        ...prev,
        currentRole: roleCode,
      };
    });
  }, []);

  /**
   * 设置切换状态
   */
  const setIsSwitching = useCallback((isSwitching: boolean) => {
    setState((prev) => ({ ...prev, isSwitching }));
  }, []);

  // 初始化时检查 token
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    switchRole,
    setCurrentRole,
    refreshUser,
    setIsSwitching,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 使用认证上下文
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
