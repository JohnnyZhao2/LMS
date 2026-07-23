import type {
  AuthorizationFormScope,
  AuthorizationFormState,
  AuthorizationScopePayload,
  PermissionCatalogItem,
  RoleAuthorizationState,
  ScopeType,
  UserAuthorizationState,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

/** 权限开关展示状态 */
export interface PermissionState {
  checked: boolean;
  locked: boolean;
  enableBlockedReason: string | null;
  disableBlockedReason: string | null;
}

/** 角色偏好默认范围（TARGET）；DATA 组优先 OWN */
export const DEFAULT_ROLE_SCOPE_TYPES: Record<RoleCode, ScopeType[]> = {
  STUDENT: [],
  MENTOR: ['MENTEES'],
  DEPT_MANAGER: ['DEPARTMENT'],
  TEAM_MANAGER: ['ALL'],
  ADMIN: ['ALL'],
  SUPER_ADMIN: ['ALL'],
};

/**
 * 比较两组用户 ID 是否相同。
 */
export const sameScopeUserIds = (left: number[], right: number[]): boolean => {
  const normalizedLeft = [...new Set(left)].sort((a, b) => a - b);
  const normalizedRight = [...new Set(right)].sort((a, b) => a - b);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

/**
 * 格式化范围摘要文案。
 */
export const formatScopeSummary = (
  scopeType: ScopeType | null,
  targetUserIds: number[] = [],
): string => {
  if (!scopeType) {
    return '请选择范围';
  }

  const scopeLabels: Record<ScopeType, string> = {
    OWN: '本人数据',
    SELF: '本人',
    MENTEES: '学员',
    DEPARTMENT: '同部门',
    ALL: '全部对象',
    EXPLICIT_USERS: targetUserIds.length > 0 ? `指定${targetUserIds.length}人` : '指定用户',
  };

  return scopeLabels[scopeType];
};

/**
 * 比较两个范围类型是否相同。
 */
export const sameScopeType = (
  left: ScopeType | null,
  right: ScopeType | null,
): boolean => left === right;

/**
 * API 授权状态 → 本地表单状态。
 */
export const toAuthorizationFormState = (
  state: UserAuthorizationState | RoleAuthorizationState,
): AuthorizationFormState => ({
  roleCode: state.role_code,
  permissionCodes: Array.from(new Set(state.permission_codes)).sort(),
  scopes: state.scopes.map((scope) => ({
    scopeGroupKey: scope.scope_group_key,
    scopeType: scope.scope_type,
    targetUserIds: Array.from(new Set(scope.target_user_ids ?? [])).sort(
      (left, right) => left - right,
    ),
  })),
});

/**
 * 本地表单 → 用户授权 API body。
 */
export const toUserAuthorizationPayload = (
  state: AuthorizationFormState,
): UserAuthorizationState => ({
  role_code: state.roleCode,
  permission_codes: Array.from(new Set(state.permissionCodes)).sort(),
  scopes: state.scopes.map((scope) => {
    const payload: AuthorizationScopePayload = {
      scope_group_key: scope.scopeGroupKey,
      scope_type: scope.scopeType,
    };
    if (scope.scopeType === 'EXPLICIT_USERS') {
      payload.target_user_ids = Array.from(new Set(scope.targetUserIds)).sort(
        (left, right) => left - right,
      );
    }
    return payload;
  }),
});

/**
 * 本地表单 → 角色模板 API scopes（不允许 EXPLICIT_USERS）。
 */
export const toRoleAuthorizationScopes = (
  scopes: AuthorizationFormScope[],
): AuthorizationScopePayload[] =>
  scopes
    .filter((scope) => scope.scopeType !== 'EXPLICIT_USERS')
    .map((scope) => ({
      scope_group_key: scope.scopeGroupKey,
      scope_type: scope.scopeType,
    }));

/**
 * 为范围组挑选默认 scope_type。
 */
export const pickDefaultScopeType = (
  allowedScopeTypes: ScopeType[],
  roleCode: RoleCode,
): ScopeType => {
  if (allowedScopeTypes.length === 0) {
    throw new Error('范围组缺少 allowed_scope_types');
  }

  if (allowedScopeTypes.includes('OWN')) {
    return 'OWN';
  }

  const preferred = DEFAULT_ROLE_SCOPE_TYPES[roleCode]?.[0];
  if (preferred && allowedScopeTypes.includes(preferred)) {
    return preferred;
  }

  return allowedScopeTypes[0];
};

/**
 * 按已启用权限重建 scopes：保留已有、补齐新增、删除孤儿。
 */
export const reconcileAuthorizationScopes = ({
  permissionCatalog,
  permissionCodes,
  currentScopes,
  roleCode,
}: {
  permissionCatalog: PermissionCatalogItem[];
  permissionCodes: string[];
  currentScopes: AuthorizationFormScope[];
  roleCode: RoleCode;
}): AuthorizationFormScope[] => {
  const enabledCodeSet = new Set(permissionCodes);
  const neededGroupKeys = new Set<string>();
  const allowedByGroup = new Map<string, ScopeType[]>();

  permissionCatalog.forEach((permission) => {
    if (!enabledCodeSet.has(permission.code)) {
      return;
    }
    if (permission.scope_kind === 'NONE' || !permission.scope_group_key) {
      return;
    }
    neededGroupKeys.add(permission.scope_group_key);
    if (!allowedByGroup.has(permission.scope_group_key)) {
      allowedByGroup.set(
        permission.scope_group_key,
        permission.allowed_scope_types,
      );
    }
  });

  const currentByKey = new Map(
    currentScopes.map((scope) => [scope.scopeGroupKey, scope]),
  );

  return Array.from(neededGroupKeys)
    .sort()
    .map((scopeGroupKey) => {
      const existing = currentByKey.get(scopeGroupKey);
      const allowed = allowedByGroup.get(scopeGroupKey) ?? [];
      if (existing && allowed.includes(existing.scopeType)) {
        return existing;
      }
      return {
        scopeGroupKey,
        scopeType: pickDefaultScopeType(allowed, roleCode),
        targetUserIds: [],
      };
    });
};

/**
 * 比较两份表单状态是否等价。
 */
export const sameAuthorizationFormState = (
  left: AuthorizationFormState,
  right: AuthorizationFormState,
): boolean => {
  if (left.roleCode !== right.roleCode) {
    return false;
  }
  if (left.permissionCodes.join('|') !== right.permissionCodes.join('|')) {
    return false;
  }
  if (left.scopes.length !== right.scopes.length) {
    return false;
  }

  const sortScopes = (scopes: AuthorizationFormScope[]) =>
    [...scopes].sort((a, b) => a.scopeGroupKey.localeCompare(b.scopeGroupKey));

  const leftScopes = sortScopes(left.scopes);
  const rightScopes = sortScopes(right.scopes);

  return leftScopes.every((scope, index) => {
    const other = rightScopes[index];
    return (
      scope.scopeGroupKey === other.scopeGroupKey
      && scope.scopeType === other.scopeType
      && sameScopeUserIds(scope.targetUserIds, other.targetUserIds)
    );
  });
};
