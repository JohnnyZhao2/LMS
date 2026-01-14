/**
 * 角色配置 - 统一管理角色颜色和图标配置
 */
import type { RoleCode } from '@/types/api';

export interface RoleColorConfig {
  bg: string;
  color: string;
  iconBg?: string;
}

/**
 * 角色颜色映射（用于标签显示）
 */
export const ROLE_COLORS: Record<string, RoleColorConfig> = {
  ADMIN: { bg: '#FEE2E2', color: '#DC2626', iconBg: '#DC2626' },
  MENTOR: { bg: '#FEF3C7', color: '#F59E0B', iconBg: '#F59E0B' },
  DEPT_MANAGER: { bg: '#EDE9FE', color: '#7C3AED', iconBg: '#7C3AED' },
  TEAM_MANAGER: { bg: '#DBEAFE', color: '#3B82F6', iconBg: '#0EA5E9' },
  STUDENT: { bg: '#DBEAFE', color: '#3B82F6', iconBg: '#3B82F6' },
};

/**
 * 获取角色颜色配置
 */
export const getRoleColor = (code: string): RoleColorConfig => {
  return ROLE_COLORS[code] || { bg: '#DBEAFE', color: '#3B82F6' };
};

/**
 * 可分配的角色列表（不含 STUDENT）
 */
export const ASSIGNABLE_ROLES: RoleCode[] = ['ADMIN', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER'];
