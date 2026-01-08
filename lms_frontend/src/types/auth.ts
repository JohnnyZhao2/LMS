/**
 * 认证相关类型定义
 */

import type { RoleCode, UserInfo, Role } from './common';

/**
 * 登录请求
 */
export interface LoginRequest {
  employee_id: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
  available_roles: Role[];
  current_role: RoleCode;
}

/**
 * 刷新令牌请求
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * 刷新令牌响应
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

/**
 * 切换角色请求
 */
export interface SwitchRoleRequest {
  role_code: RoleCode;
}

/**
 * 切换角色响应
 */
export interface SwitchRoleResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
  available_roles: Role[];
  current_role: RoleCode;
}

/**
 * 登出请求
 */
export interface LogoutRequest {
  refresh_token?: string;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}
