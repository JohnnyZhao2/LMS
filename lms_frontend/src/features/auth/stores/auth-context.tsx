import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '@/lib/token-storage';
import { loginApi } from '../api/login';
import { logoutApi } from '../api/logout';
import { switchRoleApi } from '../api/switch-role';
import { meApi } from '../api/get-me';
import type { AuthState } from '../types';
import type { LoginRequest, RoleCode } from '@/types/api';

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (roleCode: RoleCode) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * 认证 Provider
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    currentRole: null,
    availableRoles: [],
    isAuthenticated: false,
    isLoading: true,
  });

  /**
   * 从服务器获取最新用户信息并更新本地存储
   */
  const refreshUser = useCallback(async () => {
    if (!tokenStorage.hasTokens()) {
      setState({
        user: null,
        currentRole: null,
        availableRoles: [],
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      // 调用 API 获取最新用户信息
      const response = await meApi.getMe();
      
      // 更新本地存储
      tokenStorage.setUserInfo(response.user);
      tokenStorage.setCurrentRole(response.current_role);
      tokenStorage.setAvailableRoles(response.available_roles);
      
      setState({
        user: response.user,
        currentRole: response.current_role,
        availableRoles: response.available_roles,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // API 调用失败（如 token 过期），清除本地存储
      tokenStorage.clearAll();
      setState({
        user: null,
        currentRole: null,
        availableRoles: [],
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  /**
   * 登录
   */
  const login = useCallback(async (data: LoginRequest) => {
    const response = await loginApi.login(data);
    // 存储 token 和用户信息
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    tokenStorage.setUserInfo(response.user);
    tokenStorage.setCurrentRole(response.current_role);
    tokenStorage.setAvailableRoles(response.available_roles);
    
    setState({
      user: response.user,
      currentRole: response.current_role,
      availableRoles: response.available_roles,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

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
    tokenStorage.clearAll();
    setState({
      user: null,
      currentRole: null,
      availableRoles: [],
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  /**
   * 切换角色
   */
  const switchRole = useCallback(async (roleCode: RoleCode) => {
    const response = await switchRoleApi.switchRole({ role_code: roleCode });
    // 更新存储
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    tokenStorage.setUserInfo(response.user);
    tokenStorage.setCurrentRole(response.current_role);
    tokenStorage.setAvailableRoles(response.available_roles);
    
    setState((prev) => ({
      ...prev,
      user: response.user,
      currentRole: response.current_role,
      availableRoles: response.available_roles,
    }));
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
    refreshUser,
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

