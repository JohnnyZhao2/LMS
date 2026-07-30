import type { PermissionOverrideScope } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

const PERMISSION_SCOPE_ORDER: PermissionOverrideScope[] = [
  'SELF',
  'MENTEES',
  'DEPARTMENT',
  'ALL',
];

export const DEFAULT_ROLE_SCOPE_TYPES: Record<RoleCode, PermissionOverrideScope[]> = {
  STUDENT: [],
  MENTOR: ['MENTEES'],
  DEPT: ['DEPARTMENT'],
  GLOBAL: ['ALL'],
  SUPER_ADMIN: ['ALL'],
};

export const normalizeScopeTypes = (
  scopeTypes: PermissionOverrideScope[],
): PermissionOverrideScope[] => {
  const uniqueScopeTypes = Array.from(new Set(scopeTypes));
  if (uniqueScopeTypes.includes('ALL')) {
    return ['ALL'];
  }
  return PERMISSION_SCOPE_ORDER.filter((scopeType) => uniqueScopeTypes.includes(scopeType));
};

/**
 * 将角色绑定的范围类型格式化为只读摘要。
 */
export const formatScopeSummary = (
  scopeTypes: PermissionOverrideScope[],
): string => {
  const normalized = normalizeScopeTypes(scopeTypes);

  if (normalized.length === 0) {
    return '无';
  }

  const scopeLabels: Record<PermissionOverrideScope, string> = {
    SELF: '本人',
    MENTEES: '名下学员',
    DEPARTMENT: '本室学员',
    ALL: '全部',
  };

  return normalized.map((scopeType) => scopeLabels[scopeType]).join(' + ');
};
