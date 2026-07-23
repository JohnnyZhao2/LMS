import type { ScopeType } from '@/types/authorization';
import type { Department, UserList } from '@/types/common';

import {
  formatScopeSummary,
  sameScopeUserIds,
} from '@/features/user-management/components/authorization/user-form.utils';
import type { AuthorizationFormScope } from '@/types/authorization';

export interface ScopeFilterOption {
  value: string;
  label: string;
}

/** 单范围组当前选择 */
export interface RoleScopeSelection {
  scopeType: ScopeType | null;
  targetUserIds: number[];
}

export const AVAILABLE_SCOPE_TYPES: ScopeType[] = [
  'OWN',
  'SELF',
  'MENTEES',
  'DEPARTMENT',
  'ALL',
  'EXPLICIT_USERS',
];

export const normalizeScopeUserIds = (scopeUserIds: number[]): number[] => (
  Array.from(new Set(scopeUserIds)).sort((left, right) => left - right)
);

/**
 * 按目录允许列表过滤可选范围类型。
 */
export const normalizeAvailableScopeTypes = (
  scopeTypes: ScopeType[],
): ScopeType[] => {
  const scopeTypeSet = new Set(scopeTypes);
  return AVAILABLE_SCOPE_TYPES.filter((scopeType) => scopeTypeSet.has(scopeType));
};

/**
 * 指定人员可选池：活跃学员（含兼任管理角色），排除超管。
 */
export const getSelectableScopeUsers = (
  scopeUsers: UserList[],
): UserList[] => scopeUsers.filter((scopeUser) => {
  if (!scopeUser.is_active || scopeUser.is_superuser) {
    return false;
  }
  return scopeUser.roles.some((role) => role.code === 'STUDENT');
});

/**
 * 预设范围类型对应的用户集合（用于摘要展示）。
 */
export const getPresetMatchedScopeUserIds = ({
  departmentId,
  scopeType,
  selectableScopeUsers,
  userId,
}: {
  departmentId: number | null;
  scopeType: ScopeType | null;
  selectableScopeUsers: UserList[];
  userId: number | null;
}): number[] => {
  if (!scopeType || scopeType === 'OWN' || scopeType === 'EXPLICIT_USERS') {
    return [];
  }

  const matchedUserIds = new Set<number>();

  if (scopeType === 'ALL') {
    selectableScopeUsers.forEach((scopeUser) => matchedUserIds.add(scopeUser.id));
  } else if (scopeType === 'MENTEES' && userId) {
    selectableScopeUsers.forEach((scopeUser) => {
      if (scopeUser.mentor?.id === userId) {
        matchedUserIds.add(scopeUser.id);
      }
    });
  } else if (scopeType === 'DEPARTMENT' && departmentId) {
    selectableScopeUsers.forEach((scopeUser) => {
      if (scopeUser.department.id === departmentId) {
        matchedUserIds.add(scopeUser.id);
      }
    });
  } else if (scopeType === 'SELF' && userId) {
    const hasSelf = selectableScopeUsers.some((scopeUser) => scopeUser.id === userId);
    if (hasSelf) {
      matchedUserIds.add(userId);
    }
  }

  return normalizeScopeUserIds(Array.from(matchedUserIds));
};

/**
 * 从草稿 scopes 读取某一范围组选择。
 */
export const getScopeSelectionFromDraft = (
  scopes: AuthorizationFormScope[],
  scopeGroupKey?: string | null,
): RoleScopeSelection | null => {
  if (!scopeGroupKey) {
    return null;
  }
  const scope = scopes.find((item) => item.scopeGroupKey === scopeGroupKey);
  if (!scope) {
    return null;
  }
  return {
    scopeType: scope.scopeType,
    targetUserIds: normalizeScopeUserIds(scope.targetUserIds),
  };
};

/**
 * 同步选择：校验可用类型并裁剪指定人员。
 */
export const syncRoleScopeSelection = ({
  selection,
  selectableScopeUserIdSet,
  availableScopeTypes,
}: {
  selection: RoleScopeSelection;
  selectableScopeUserIdSet: Set<number>;
  availableScopeTypes?: ScopeType[];
}): RoleScopeSelection => {
  const normalizedAvailable = availableScopeTypes && availableScopeTypes.length > 0
    ? new Set(normalizeAvailableScopeTypes(availableScopeTypes))
    : null;

  if (
    selection.scopeType
    && normalizedAvailable
    && !normalizedAvailable.has(selection.scopeType)
  ) {
    return { scopeType: null, targetUserIds: [] };
  }

  if (selection.scopeType === 'EXPLICIT_USERS') {
    return {
      scopeType: 'EXPLICIT_USERS',
      targetUserIds: normalizeScopeUserIds(
        selection.targetUserIds.filter((id) => selectableScopeUserIdSet.has(id)),
      ),
    };
  }

  return {
    scopeType: selection.scopeType,
    targetUserIds: [],
  };
};

/**
 * 解析范围组当前选择：优先草稿，否则空。
 */
export const resolveRoleScopeSelection = ({
  draftScopes,
  scopeGroupKey,
  selectableScopeUserIdSet,
  availableScopeTypes,
}: {
  draftScopes: AuthorizationFormScope[];
  scopeGroupKey?: string | null;
  selectableScopeUserIdSet: Set<number>;
  availableScopeTypes?: ScopeType[];
}): RoleScopeSelection => {
  const fromDraft = getScopeSelectionFromDraft(draftScopes, scopeGroupKey);
  const fallback: RoleScopeSelection = fromDraft ?? {
    scopeType: null,
    targetUserIds: [],
  };

  return syncRoleScopeSelection({
    selection: fallback,
    selectableScopeUserIdSet,
    availableScopeTypes,
  });
};

/**
 * 格式化范围摘要（含部门名别名）。
 */
export const formatScopeSummaryForDisplay = ({
  departments,
  scopeType,
  targetUserIds,
  selectableScopeUsers,
  selectedDepartmentName,
}: {
  departments: Department[];
  scopeType: ScopeType | null;
  targetUserIds: number[];
  selectableScopeUsers: UserList[];
  selectedDepartmentName?: string;
}): string => {
  const normalizedScopeUserIds = normalizeScopeUserIds(targetUserIds);
  const allScopeUserIds = selectableScopeUsers.map((scopeUser) => scopeUser.id);

  if (scopeType === 'ALL') {
    return '全部';
  }
  if (scopeType === 'DEPARTMENT' && selectedDepartmentName) {
    return selectedDepartmentName;
  }
  if (scopeType === 'OWN') {
    return '本人数据';
  }
  if (scopeType === 'EXPLICIT_USERS') {
    if (normalizedScopeUserIds.length === 0) {
      return '指定用户';
    }

    for (const department of departments) {
      const departmentUserIds = selectableScopeUsers
        .filter((scopeUser) => scopeUser.department?.id === department.id)
        .map((scopeUser) => scopeUser.id);
      if (
        departmentUserIds.length > 0
        && sameScopeUserIds(normalizedScopeUserIds, departmentUserIds)
      ) {
        return department.name;
      }
    }

    if (
      allScopeUserIds.length > 0
      && sameScopeUserIds(normalizedScopeUserIds, allScopeUserIds)
    ) {
      return '全部';
    }

    return formatScopeSummary(scopeType, normalizedScopeUserIds);
  }

  return formatScopeSummary(scopeType, normalizedScopeUserIds)
    .replaceAll('全部对象', '全部')
    .replaceAll('同部门', selectedDepartmentName ?? '同部门');
};
