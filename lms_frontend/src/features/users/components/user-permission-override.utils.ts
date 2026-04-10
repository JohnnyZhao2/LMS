import type {
  CreateUserPermissionOverrideRequest,
  PermissionOverrideScope,
  UserPermissionOverride,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

import {
  normalizeScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';
import { normalizeScopeUserIds } from './user-permission-section.helpers';
import type { PermissionState } from './user-permission-section.types';

const matchesSelectedScope = (
  scopeType: PermissionOverrideScope,
  scopeUserIds: number[],
  selectedPermissionScopes: PermissionOverrideScope[],
  selectedScopeUserIds: number[],
): boolean => {
  if (scopeType === 'SELF') {
    return selectedPermissionScopes.length === 0;
  }
  if (scopeType !== 'EXPLICIT_USERS') {
    return selectedPermissionScopes.includes(scopeType);
  }
  return selectedPermissionScopes.includes('EXPLICIT_USERS') && sameScopeUserIds(scopeUserIds, selectedScopeUserIds);
};

const getToggleBlockedReason = ({
  canManageOverride,
  hasSelectedExplicitUsers,
  hasSelectedScopes,
  isScopeAware,
  needsCreate,
  needsRevoke,
  nextChecked,
}: {
  canManageOverride: boolean;
  hasSelectedExplicitUsers: boolean;
  hasSelectedScopes: boolean;
  isScopeAware: boolean;
  needsCreate: boolean;
  needsRevoke: boolean;
  nextChecked: boolean;
}): string | null => {
  if (isScopeAware && !hasSelectedScopes) {
    return '请先选择扩展范围';
  }
  if (isScopeAware && !hasSelectedExplicitUsers) {
    return '请选择至少一个指定用户';
  }
  if (needsRevoke && !canManageOverride) {
    return nextChecked ? '当前账号没有撤销权限，无法启用该权限' : '当前账号没有撤销权限，无法禁用该权限';
  }
  if (needsCreate && !canManageOverride) {
    return nextChecked ? '当前账号没有创建权限，无法启用该权限' : '当前账号没有创建权限，无法禁用该权限';
  }
  return null;
};

export const getRolePermissionOverrideBuckets = (
  userOverrides: UserPermissionOverride[],
  roleCode: RoleCode,
): {
  activeScopeAllowOverrides: Map<string, UserPermissionOverride[]>;
  activeScopeDenyOverrides: Map<string, UserPermissionOverride[]>;
} => {
  const activeScopedOverrides = userOverrides.filter((override) => (
    override.is_active && override.applies_to_role === roleCode
  ));
  const activeScopeAllowOverrides = new Map<string, UserPermissionOverride[]>();
  const activeScopeDenyOverrides = new Map<string, UserPermissionOverride[]>();

  activeScopedOverrides.forEach((override) => {
    const targetMap = override.effect === 'ALLOW' ? activeScopeAllowOverrides : activeScopeDenyOverrides;
    const current = targetMap.get(override.permission_code) ?? [];
    targetMap.set(override.permission_code, [...current, override]);
  });

  return { activeScopeAllowOverrides, activeScopeDenyOverrides };
};

export const resolvePermissionState = ({
  allowOverrides,
  canManageOverride,
  denyOverrides,
  fromTemplate,
  isScopeAware,
  selectedPermissionScopes,
  selectedRoleDefaultScopeTypes,
  selectedScopeUserIds,
}: {
  allowOverrides: UserPermissionOverride[];
  canManageOverride: boolean;
  denyOverrides: UserPermissionOverride[];
  fromTemplate: boolean;
  isScopeAware: boolean;
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
}): PermissionState => {
  const hasSelectedScopes = selectedPermissionScopes.length > 0;
  const hasSelectedExplicitUsers = (
    !selectedPermissionScopes.includes('EXPLICIT_USERS') || selectedScopeUserIds.length > 0
  );

  if (!isScopeAware) {
    const needsCreateToEnable = !fromTemplate && allowOverrides.length === 0;
    const needsCreateToDisable = fromTemplate;
    const needsRevokeToEnable = denyOverrides.length > 0;
    const needsRevokeToDisable = allowOverrides.length > 0;
    const checked = needsRevokeToEnable
      ? false
      : allowOverrides.length > 0
        ? true
        : fromTemplate;

    return {
      checked,
      enableBlockedReason: getToggleBlockedReason({
        nextChecked: true,
        isScopeAware,
        hasSelectedScopes: true,
        hasSelectedExplicitUsers,
        needsCreate: needsCreateToEnable,
        needsRevoke: needsRevokeToEnable,
        canManageOverride,
      }),
      disableBlockedReason: getToggleBlockedReason({
        nextChecked: false,
        isScopeAware,
        hasSelectedScopes: true,
        hasSelectedExplicitUsers,
        needsCreate: needsCreateToDisable,
        needsRevoke: needsRevokeToDisable,
        canManageOverride,
      }),
      fromTemplate,
      allowOverrides,
      denyOverrides,
      selectedAllowOverrides: allowOverrides,
      selectedDenyOverrides: denyOverrides,
      inheritedSelectedScopeTypes: fromTemplate ? ['ALL'] : [],
      isSelfOnlySelection: false,
      hasSelfAllow: false,
      hasNonSelfAllow: allowOverrides.length > 0,
      hasExactExplicitAllow: false,
      missingSelectedAllowScopeTypes: needsCreateToEnable ? ['ALL'] : [],
    };
  }

  const selectedStandardScopeTypes = normalizeScopeTypes(selectedPermissionScopes).filter(
    (scopeType): scopeType is Exclude<PermissionOverrideScope, 'EXPLICIT_USERS'> => scopeType !== 'EXPLICIT_USERS',
  );
  const isSelfOnlySelection = !hasSelectedScopes;
  const inheritedScopeTypes: Exclude<PermissionOverrideScope, 'EXPLICIT_USERS'>[] = fromTemplate
    ? selectedRoleDefaultScopeTypes.filter(
      (scopeType): scopeType is Exclude<PermissionOverrideScope, 'EXPLICIT_USERS'> => scopeType !== 'EXPLICIT_USERS',
    )
    : [];
  const hasExactExplicitAllow = allowOverrides.some(
    (override) => override.scope_type === 'EXPLICIT_USERS' && sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds),
  );
  const hasExactExplicitDeny = denyOverrides.some(
    (override) => override.scope_type === 'EXPLICIT_USERS' && sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds),
  );
  const hasSelfAllow = allowOverrides.some((override) => override.scope_type === 'SELF');
  const hasSelfDeny = denyOverrides.some((override) => override.scope_type === 'SELF');
  const hasNonSelfAllow = allowOverrides.some((override) => override.scope_type !== 'SELF');
  const isSelfGranted = !hasSelfDeny && (fromTemplate || hasSelfAllow || hasNonSelfAllow);
  const selectedAllowOverrides = allowOverrides.filter((override) =>
    matchesSelectedScope(override.scope_type, override.scope_user_ids, selectedPermissionScopes, selectedScopeUserIds),
  );
  const selectedDenyOverrides = denyOverrides.filter((override) =>
    matchesSelectedScope(override.scope_type, override.scope_user_ids, selectedPermissionScopes, selectedScopeUserIds),
  );
  const isStandardScopeGranted = (scopeType: Exclude<PermissionOverrideScope, 'EXPLICIT_USERS'>) => {
    if (denyOverrides.some((override) => override.scope_type === scopeType)) {
      return false;
    }
    if (inheritedScopeTypes.includes(scopeType)) {
      return true;
    }
    return allowOverrides.some((override) => override.scope_type === scopeType);
  };
  const checked = isSelfOnlySelection
    ? isSelfGranted
    : (
      selectedStandardScopeTypes.every((scopeType) => isStandardScopeGranted(scopeType))
      && (
        !selectedPermissionScopes.includes('EXPLICIT_USERS')
        || (selectedScopeUserIds.length > 0 && hasExactExplicitAllow && !hasExactExplicitDeny)
      )
    );
  const missingSelectedAllowScopeTypes = selectedStandardScopeTypes.filter((scopeType) => (
    !inheritedScopeTypes.includes(scopeType)
    && !allowOverrides.some((override) => override.scope_type === scopeType)
  ));
  const inheritedSelectedScopeTypes = selectedStandardScopeTypes.filter((scopeType) =>
    inheritedScopeTypes.includes(scopeType),
  );
  const staleExplicitOverrides = [...allowOverrides, ...denyOverrides].filter((override) => (
    override.scope_type === 'EXPLICIT_USERS'
    && (
      !selectedPermissionScopes.includes('EXPLICIT_USERS')
      || !sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds)
    )
  ));
  const needsCreateToEnable = (
    missingSelectedAllowScopeTypes.length > 0
    || (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow)
    || (isSelfOnlySelection && !fromTemplate && !hasSelfAllow && !hasNonSelfAllow)
  );
  const needsCreateToDisable = (
    (isSelfOnlySelection && (fromTemplate || hasNonSelfAllow))
    || inheritedSelectedScopeTypes.length > 0
  );
  const needsRevokeToEnable = selectedDenyOverrides.length > 0 || staleExplicitOverrides.length > 0;
  const needsRevokeToDisable = selectedAllowOverrides.length > 0;

  return {
    checked,
    enableBlockedReason: getToggleBlockedReason({
      nextChecked: true,
      isScopeAware,
      hasSelectedScopes,
      hasSelectedExplicitUsers,
      needsCreate: needsCreateToEnable,
      needsRevoke: needsRevokeToEnable,
      canManageOverride,
    }),
    disableBlockedReason: getToggleBlockedReason({
      nextChecked: false,
      isScopeAware,
      hasSelectedScopes,
      hasSelectedExplicitUsers,
      needsCreate: needsCreateToDisable,
      needsRevoke: needsRevokeToDisable,
      canManageOverride,
    }),
    fromTemplate,
    allowOverrides,
    denyOverrides,
    selectedAllowOverrides,
    selectedDenyOverrides,
    inheritedSelectedScopeTypes,
    isSelfOnlySelection,
    hasSelfAllow,
    hasNonSelfAllow,
    hasExactExplicitAllow,
    missingSelectedAllowScopeTypes,
  };
};

export const buildPermissionTogglePlan = ({
  isScopeAware,
  nextChecked,
  permissionCode,
  permissionState,
  roleCode,
  selectedPermissionScopes,
  selectedScopeUserIds,
}: {
  isScopeAware: boolean;
  nextChecked: boolean;
  permissionCode: string;
  permissionState: PermissionState;
  roleCode: RoleCode;
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
}): {
  overridesToRevoke: UserPermissionOverride[];
  payloadsToCreate: CreateUserPermissionOverrideRequest[];
} => {
  const {
    checked: currentChecked,
    fromTemplate,
    allowOverrides,
    denyOverrides,
    selectedAllowOverrides,
    selectedDenyOverrides,
    inheritedSelectedScopeTypes,
    isSelfOnlySelection,
    hasSelfAllow,
    hasNonSelfAllow,
    hasExactExplicitAllow,
    missingSelectedAllowScopeTypes,
  } = permissionState;
  const overridesToRevoke: UserPermissionOverride[] = [];
  const payloadsToCreate: CreateUserPermissionOverrideRequest[] = [];

  if (!isScopeAware) {
    if (nextChecked) {
      overridesToRevoke.push(...denyOverrides);
      if (!fromTemplate && allowOverrides.length === 0) {
        payloadsToCreate.push({
          permission_code: permissionCode,
          effect: 'ALLOW',
          applies_to_role: roleCode,
          scope_type: 'ALL',
          scope_user_ids: [],
        });
      }
    } else {
      overridesToRevoke.push(...allowOverrides);
      if (fromTemplate) {
        payloadsToCreate.push({
          permission_code: permissionCode,
          effect: 'DENY',
          applies_to_role: roleCode,
          scope_type: 'ALL',
          scope_user_ids: [],
        });
      }
    }

    return { overridesToRevoke, payloadsToCreate };
  }

  if (currentChecked === nextChecked) {
    return { overridesToRevoke, payloadsToCreate };
  }

  const staleExplicitOverrides = [...allowOverrides, ...denyOverrides].filter((override) => (
    override.scope_type === 'EXPLICIT_USERS'
    && (
      !selectedPermissionScopes.includes('EXPLICIT_USERS')
      || !sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds)
    )
  ));

  if (isSelfOnlySelection) {
    if (nextChecked) {
      overridesToRevoke.push(...selectedDenyOverrides);
      if (!fromTemplate && !hasSelfAllow && !hasNonSelfAllow) {
        payloadsToCreate.push({
          permission_code: permissionCode,
          effect: 'ALLOW',
          applies_to_role: roleCode,
          scope_type: 'SELF',
          scope_user_ids: [],
        });
      }
    } else {
      overridesToRevoke.push(...selectedAllowOverrides);
      if (fromTemplate || hasNonSelfAllow) {
        payloadsToCreate.push({
          permission_code: permissionCode,
          effect: 'DENY',
          applies_to_role: roleCode,
          scope_type: 'SELF',
          scope_user_ids: [],
        });
      }
    }

    return { overridesToRevoke, payloadsToCreate };
  }

  if (nextChecked) {
    overridesToRevoke.push(...selectedDenyOverrides, ...staleExplicitOverrides);
    missingSelectedAllowScopeTypes.forEach((scopeType) => {
      payloadsToCreate.push({
        permission_code: permissionCode,
        effect: 'ALLOW',
        applies_to_role: roleCode,
        scope_type: scopeType,
        scope_user_ids: [],
      });
    });
    if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow) {
      payloadsToCreate.push({
        permission_code: permissionCode,
        effect: 'ALLOW',
        applies_to_role: roleCode,
        scope_type: 'EXPLICIT_USERS',
        scope_user_ids: normalizeScopeUserIds(selectedScopeUserIds),
      });
    }
  } else {
    overridesToRevoke.push(...selectedAllowOverrides);
    inheritedSelectedScopeTypes.forEach((scopeType) => {
      payloadsToCreate.push({
        permission_code: permissionCode,
        effect: 'DENY',
        applies_to_role: roleCode,
        scope_type: scopeType,
        scope_user_ids: [],
      });
    });
  }

  return { overridesToRevoke, payloadsToCreate };
};
