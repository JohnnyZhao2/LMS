/**
 * 认证相关类型定义
 */

import type { Role, UserInfo } from './common';
import type { CapabilityCodes } from './authorization';

/**
 * 登录请求
 */
export interface LoginRequest {
  employee_id: string;
  password: string;
}

export interface ChangeOwnPasswordRequest {
  current_password: string;
  password: string;
}

/**
 * 登录 / 会话响应
 */
export interface AuthSessionPayload {
  user: UserInfo;
  roles: Role[];
  capabilities: CapabilityCodes;
}

/**
 * 令牌对
 */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthSessionPayload, TokenPair {}

export type ChangeOwnPasswordResponse = LoginResponse;

export interface OneAccountAuthorizeUrlResponse {
  authorize_url: string;
}
