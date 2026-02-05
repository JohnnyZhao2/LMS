import type { RoleCode } from '@/types/api';

/**
 * 当前角色状态管理（用于 API 请求）
 * 这是一个简单的全局状态，由 React 组件更新，供 api-client 读取
 */
let currentRole: RoleCode | null = null;

export const roleState = {
  get(): RoleCode | null {
    return currentRole;
  },

  set(role: RoleCode | null): void {
    currentRole = role;
  },
};
