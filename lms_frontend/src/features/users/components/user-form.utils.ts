import type { PermissionOverrideScope, RoleCode } from '@/types/api';

export const PERMISSION_SCOPE_ORDER: PermissionOverrideScope[] = [
  'SELF',
  'MENTEES',
  'DEPARTMENT',
  'ALL',
  'EXPLICIT_USERS',
];

export const DEFAULT_ROLE_SCOPE_TYPES: Record<RoleCode, PermissionOverrideScope[]> = {
  STUDENT: [],
  MENTOR: ['MENTEES'],
  DEPT_MANAGER: ['DEPARTMENT'],
  TEAM_MANAGER: ['ALL'],
  ADMIN: ['ALL'],
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

export const sameScopeUserIds = (left: number[], right: number[]): boolean => {
  const normalizedLeft = [...new Set(left)].sort((a, b) => a - b);
  const normalizedRight = [...new Set(right)].sort((a, b) => a - b);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

export const formatScopeSummary = (
  scopeTypes: PermissionOverrideScope[],
  scopeUserIds: number[] = [],
): string => {
  const normalized = normalizeScopeTypes(scopeTypes);

  if (normalized.length === 0) {
    return '请选择范围';
  }

  const scopeLabels: Record<PermissionOverrideScope, string> = {
    SELF: '本人',
    MENTEES: '学员',
    DEPARTMENT: '同部门',
    ALL: '全部对象',
    EXPLICIT_USERS: scopeUserIds.length > 0 ? `指定${scopeUserIds.length}人` : '指定用户',
  };

  return normalized.map((scopeType) => scopeLabels[scopeType]).join(' + ');
};

export const sameScopeTypes = (
  left: PermissionOverrideScope[],
  right: PermissionOverrideScope[],
): boolean => {
  const normalizedLeft = normalizeScopeTypes(left);
  const normalizedRight = normalizeScopeTypes(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};
