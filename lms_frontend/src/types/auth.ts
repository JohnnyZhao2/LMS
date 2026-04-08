/**
 * 认证相关类型定义
 */

import type { RoleCode, UserInfo, Role } from './common';
import type { CapabilityMap } from './authorization';

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
export interface AuthSessionPayload {
  user: UserInfo;
  available_roles: Role[];
  current_role: RoleCode;
  capabilities: CapabilityMap;
}

/**
 * 登录响应
 */
export interface LoginResponse extends AuthSessionPayload {
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
export interface SwitchRoleResponse extends AuthSessionPayload {
  access_token: string;
  refresh_token: string;
}

/**
 * 获取当前用户信息响应
 */
export type MeResponse = AuthSessionPayload;

/**
 * 登出请求
 */
export interface LogoutRequest {
  refresh_token?: string;
}


export interface OidcAuthorizeUrlResponse {
  authorize_url: string;
  state: string;
}

export interface OidcCodeLoginRequest {
  code: string;
}
