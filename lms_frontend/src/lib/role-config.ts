/**
 * 角色配置 - 统一管理角色颜色和图标配置
 */
import type { RoleCode } from '@/types/api';

export interface RoleColorConfig {
  bgClass: string;
  textClass: string;
  iconBgClass?: string;
  borderClass?: string;
}

/**
 * 角色颜色映射（用于标签显示）
 */
export const ROLE_COLORS: Record<string, RoleColorConfig> = {
  ADMIN: { bgClass: 'bg-destructive-100', textClass: 'text-destructive', iconBgClass: 'bg-destructive', borderClass: 'border-destructive' },
  MENTOR: { bgClass: 'bg-warning-100', textClass: 'text-warning', iconBgClass: 'bg-warning', borderClass: 'border-warning' },
  DEPT_MANAGER: { bgClass: 'bg-primary-100', textClass: 'text-primary-600', iconBgClass: 'bg-primary-600', borderClass: 'border-primary-600' },
  TEAM_MANAGER: { bgClass: 'bg-primary-100', textClass: 'text-primary', iconBgClass: 'bg-primary-500', borderClass: 'border-primary' },
  STUDENT: { bgClass: 'bg-primary-100', textClass: 'text-primary', iconBgClass: 'bg-primary', borderClass: 'border-primary' },
};

/**
 * 获取角色颜色配置
 */
export const getRoleColor = (code: string): RoleColorConfig => {
  return ROLE_COLORS[code] || { bgClass: 'bg-primary-100', textClass: 'text-primary', iconBgClass: 'bg-primary', borderClass: 'border-primary' };
};

/**
 * 可分配的角色列表（不含 STUDENT）
 */
export const ASSIGNABLE_ROLES: RoleCode[] = ['ADMIN', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER'];
