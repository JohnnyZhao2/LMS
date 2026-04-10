import type { PermissionOverrideScope, UserPermissionOverride } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import type { Department, UserList } from '@/types/common';

import {
  formatScopeSummary,
  normalizeScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';
import { normalizeScopeUserIds } from './user-permission-section.helpers';

export interface RoleScopeSelection {
  scopeTypes: PermissionOverrideScope[];
  scopeUserIds: number[];
}

export const STUDENT_ONLY_SCOPE_PERMISSION_CODES = new Set<string>([
  'task.assign',
  'task.analytics.view',
  'spot_check.view',
  'spot_check.create',
]);

export const getSelectableScopeUsers = (
  scopeUsers: UserList[],
  shouldRestrictToStudents: boolean,
): UserList[] => scopeUsers.filter((scopeUser) => (
  !scopeUser.is_superuser
  && (!shouldRestrictToStudents || scopeUser.roles.some((role) => role.code === 'STUDENT'))
));

export const getPresetMatchedScopeUserIds = ({
  departmentId,
  scopeTypes,
  selectableScopeUsers,
  userId,
}: {
  departmentId: number | null;
  scopeTypes: PermissionOverrideScope[];
  selectableScopeUsers: UserList[];
  userId: number | null;
}): number[] => {
  const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
  if (normalizedScopeTypes.length === 0) {
    return [];
  }

  const matchedUserIds = new Set<number>();

  for (const scopeType of normalizedScopeTypes) {
    if (scopeType === 'ALL') {
      selectableScopeUsers.forEach((scopeUser) => matchedUserIds.add(scopeUser.id));
      continue;
    }

    if (scopeType === 'MENTEES' && userId) {
      selectableScopeUsers.forEach((scopeUser) => {
        if (scopeUser.mentor?.id === userId) {
          matchedUserIds.add(scopeUser.id);
        }
      });
      continue;
    }

    if (scopeType === 'DEPARTMENT' && departmentId) {
      selectableScopeUsers.forEach((scopeUser) => {
        if (scopeUser.department.id === departmentId) {
          matchedUserIds.add(scopeUser.id);
        }
      });
      continue;
    }

    if (scopeType === 'SELF' && userId) {
      const hasSelf = selectableScopeUsers.some((scopeUser) => scopeUser.id === userId);
      if (hasSelf) {
        matchedUserIds.add(userId);
      }
    }
  }

  return normalizeScopeUserIds(Array.from(matchedUserIds));
};

export const syncRoleScopeSelection = ({
  getPresetMatchedScopeUserIdsForSelection,
  selectableScopeUserIdSet,
  selection,
}: {
  getPresetMatchedScopeUserIdsForSelection: (scopeTypes: PermissionOverrideScope[]) => number[];
  selectableScopeUserIdSet: Set<number>;
  selection: RoleScopeSelection;
}): RoleScopeSelection => {
  const scopeTypes = normalizeScopeTypes(selection.scopeTypes);
  if (scopeTypes.includes('EXPLICIT_USERS')) {
    return {
      scopeTypes,
      scopeUserIds: normalizeScopeUserIds(
        selection.scopeUserIds.filter((scopeUserId) => selectableScopeUserIdSet.has(scopeUserId)),
      ),
    };
  }

  return {
    scopeTypes,
    scopeUserIds: getPresetMatchedScopeUserIdsForSelection(scopeTypes),
  };
};

export const getRoleScopeSelectionFromOverrides = ({
  getPresetMatchedScopeUserIdsForSelection,
  roleCode,
  userOverrides,
}: {
  getPresetMatchedScopeUserIdsForSelection: (scopeTypes: PermissionOverrideScope[]) => number[];
  roleCode: RoleCode;
  userOverrides: UserPermissionOverride[];
}): RoleScopeSelection | null => {
  const scopedOverrides = userOverrides.filter((override) => (
    override.is_active && override.applies_to_role === roleCode
  ));
  if (scopedOverrides.length === 0) {
    return null;
  }

  const scopedAllowOverrides = scopedOverrides.filter((override) => override.effect === 'ALLOW');
  const sourceOverrides = scopedAllowOverrides.length > 0 ? scopedAllowOverrides : scopedOverrides;
  const standardScopeTypes = normalizeScopeTypes(
    sourceOverrides
      .map((override) => override.scope_type)
      .filter((scopeType): scopeType is Exclude<PermissionOverrideScope, 'EXPLICIT_USERS' | 'SELF'> => (
        scopeType !== 'EXPLICIT_USERS' && scopeType !== 'SELF'
      )),
  );
  const explicitOverride = sourceOverrides.find((override) => (
    override.scope_type === 'EXPLICIT_USERS' && override.scope_user_ids.length > 0
  ));
  const explicitScopeUserIds = normalizeScopeUserIds(explicitOverride?.scope_user_ids ?? []);
  const scopeTypes = normalizeScopeTypes([
    ...standardScopeTypes,
    ...(explicitScopeUserIds.length > 0 ? ['EXPLICIT_USERS' as const] : []),
  ]);

  if (scopeTypes.length === 0 && explicitScopeUserIds.length === 0) {
    return { scopeTypes: [], scopeUserIds: [] };
  }

  return {
    scopeTypes,
    scopeUserIds: explicitScopeUserIds.length > 0
      ? explicitScopeUserIds
      : getPresetMatchedScopeUserIdsForSelection(scopeTypes),
  };
};

export const resolveRoleScopeSelection = ({
  cachedSelection,
  getPresetMatchedScopeUserIdsForSelection,
  roleCode,
  selectableScopeUserIdSet,
  selectedRoleDefaultScopeTypes,
  userOverrides,
}: {
  cachedSelection?: RoleScopeSelection;
  getPresetMatchedScopeUserIdsForSelection: (scopeTypes: PermissionOverrideScope[]) => number[];
  roleCode: RoleCode;
  selectableScopeUserIdSet: Set<number>;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  userOverrides: UserPermissionOverride[];
}): RoleScopeSelection => {
  if (cachedSelection) {
    return syncRoleScopeSelection({
      getPresetMatchedScopeUserIdsForSelection,
      selectableScopeUserIdSet,
      selection: cachedSelection,
    });
  }

  const overrideSelection = getRoleScopeSelectionFromOverrides({
    getPresetMatchedScopeUserIdsForSelection,
    roleCode,
    userOverrides,
  });
  const fallbackSelection: RoleScopeSelection = overrideSelection ?? {
    scopeTypes: selectedRoleDefaultScopeTypes,
    scopeUserIds: getPresetMatchedScopeUserIdsForSelection(selectedRoleDefaultScopeTypes),
  };

  return syncRoleScopeSelection({
    getPresetMatchedScopeUserIdsForSelection,
    selectableScopeUserIdSet,
    selection: fallbackSelection,
  });
};

const formatScopeSummaryWithDedup = ({
  getPresetMatchedScopeUserIdsForSelection,
  scopeTypes,
  scopeUserIds,
}: {
  getPresetMatchedScopeUserIdsForSelection: (scopeTypes: PermissionOverrideScope[]) => number[];
  scopeTypes: PermissionOverrideScope[];
  scopeUserIds: number[];
}): string => {
  const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
  if (!normalizedScopeTypes.includes('EXPLICIT_USERS')) {
    return formatScopeSummary(normalizedScopeTypes, scopeUserIds);
  }

  const standardScopeTypes = normalizedScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS');
  const coveredUserIdSet = new Set(getPresetMatchedScopeUserIdsForSelection(standardScopeTypes));
  const explicitExtraUserIds = Array.from(new Set(scopeUserIds)).filter(
    (scopeUserId) => !coveredUserIdSet.has(scopeUserId),
  );
  const displayScopeTypes = explicitExtraUserIds.length > 0
    ? normalizedScopeTypes
    : normalizedScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS');

  return formatScopeSummary(displayScopeTypes, explicitExtraUserIds);
};

export const formatScopeSummaryForDisplay = ({
  departments,
  getPresetMatchedScopeUserIdsForSelection,
  scopeTypes,
  scopeUserIds,
  selectableScopeUsers,
  selectedDepartmentName,
}: {
  departments: Department[];
  getPresetMatchedScopeUserIdsForSelection: (scopeTypes: PermissionOverrideScope[]) => number[];
  scopeTypes: PermissionOverrideScope[];
  scopeUserIds: number[];
  selectableScopeUsers: UserList[];
  selectedDepartmentName?: string;
}): string => {
  const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
  const normalizedScopeUserIds = normalizeScopeUserIds(scopeUserIds);
  const allScopeUserIds = selectableScopeUsers.map((scopeUser) => scopeUser.id);
  const resolveExplicitUsersAlias = (): string | null => {
    if (normalizedScopeUserIds.length === 0) {
      return null;
    }

    for (const department of departments) {
      const departmentUserIds = selectableScopeUsers
        .filter((scopeUser) => scopeUser.department?.id === department.id)
        .map((scopeUser) => scopeUser.id);
      if (departmentUserIds.length > 0 && sameScopeUserIds(normalizedScopeUserIds, departmentUserIds)) {
        return department.name;
      }
    }

    if (allScopeUserIds.length > 0 && sameScopeUserIds(normalizedScopeUserIds, allScopeUserIds)) {
      return '全部';
    }

    return null;
  };

  if (normalizedScopeTypes.length === 1) {
    if (normalizedScopeTypes[0] === 'ALL') {
      return '全部';
    }
    if (normalizedScopeTypes[0] === 'DEPARTMENT' && selectedDepartmentName) {
      return selectedDepartmentName;
    }
    if (normalizedScopeTypes[0] === 'EXPLICIT_USERS') {
      const explicitUsersAlias = resolveExplicitUsersAlias();
      if (explicitUsersAlias) {
        return explicitUsersAlias;
      }
    }
  }

  return formatScopeSummaryWithDedup({
    getPresetMatchedScopeUserIdsForSelection,
    scopeTypes: normalizedScopeTypes,
    scopeUserIds: normalizedScopeUserIds,
  })
    .replaceAll('全部对象', '全部')
    .replaceAll('同部门', selectedDepartmentName ?? '同部门');
};
