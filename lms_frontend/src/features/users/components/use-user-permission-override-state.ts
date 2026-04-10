import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  CreateUserPermissionOverrideRequest,
  PermissionOverrideScope,
  RoleCode,
  UserPermissionOverride,
} from '@/types/api';
import { showApiError } from '@/utils/error-handler';

import {
  normalizeScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';
import {
  getOverrideSignature,
  normalizeScopeUserIds,
} from './user-permission-section.helpers';
import type { PermissionState } from './user-permission-section.types';

interface UseUserPermissionOverrideStateParams {
  userId?: number;
  canManageOverride: boolean;
  normalizedSelectedPermissionRole: RoleCode;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
  roleTemplatePermissionCodes: Set<string>;
  userOverrides: UserPermissionOverride[];
  isScopeAwarePermission: (permissionCode: string) => boolean;
  createOverride: (params: {
    userId: number;
    data: CreateUserPermissionOverrideRequest;
  }) => Promise<unknown>;
  revokeOverride: (params: {
    userId: number;
    overrideId: number;
  }) => Promise<unknown>;
  refreshUser: () => Promise<unknown>;
  refetchUserOverrides: () => Promise<unknown>;
}

interface UseUserPermissionOverrideStateResult {
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (permissionCode: string, nextChecked: boolean) => Promise<void>;
  isPermissionSaving: (permissionCode: string) => boolean;
}

function matchesSelectedScope(
  scopeType: PermissionOverrideScope,
  scopeUserIds: number[],
  selectedPermissionScopes: PermissionOverrideScope[],
  selectedScopeUserIds: number[],
): boolean {
  if (scopeType === 'SELF') {
    return selectedPermissionScopes.length === 0;
  }
  if (scopeType !== 'EXPLICIT_USERS') {
    return selectedPermissionScopes.includes(scopeType);
  }
  return selectedPermissionScopes.includes('EXPLICIT_USERS') && sameScopeUserIds(scopeUserIds, selectedScopeUserIds);
}

function getToggleBlockedReason({
  nextChecked,
  isScopeAware,
  hasSelectedScopes,
  hasSelectedExplicitUsers,
  needsCreate,
  needsRevoke,
  canManageOverride,
}: {
  nextChecked: boolean;
  isScopeAware: boolean;
  hasSelectedScopes: boolean;
  hasSelectedExplicitUsers: boolean;
  needsCreate: boolean;
  needsRevoke: boolean;
  canManageOverride: boolean;
}): string | null {
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
}

export const useUserPermissionOverrideState = ({
  userId,
  canManageOverride,
  normalizedSelectedPermissionRole,
  selectedRoleDefaultScopeTypes,
  selectedPermissionScopes,
  selectedScopeUserIds,
  roleTemplatePermissionCodes,
  userOverrides,
  isScopeAwarePermission,
  createOverride,
  revokeOverride,
  refreshUser,
  refetchUserOverrides,
}: UseUserPermissionOverrideStateParams): UseUserPermissionOverrideStateResult => {
  const [savingPermissionCodes, setSavingPermissionCodes] = useState<string[]>([]);

  const activeScopedOverrides = useMemo(
    () => userOverrides.filter((override) => (
      override.is_active && override.applies_to_role === normalizedSelectedPermissionRole
    )),
    [normalizedSelectedPermissionRole, userOverrides],
  );

  const activeScopeAllowOverrides = useMemo(
    () => activeScopedOverrides.filter((override) => override.effect === 'ALLOW'),
    [activeScopedOverrides],
  );

  const activeScopeDenyOverrides = useMemo(
    () => activeScopedOverrides.filter((override) => override.effect === 'DENY'),
    [activeScopedOverrides],
  );

  const isPermissionSaving = useCallback(
    (permissionCode: string) => savingPermissionCodes.includes(permissionCode),
    [savingPermissionCodes],
  );

  const getPermissionState = useCallback((permissionCode: string): PermissionState => {
    const fromTemplate = roleTemplatePermissionCodes.has(permissionCode);
    const isScopeAware = isScopeAwarePermission(permissionCode);
    const allowOverrides = activeScopeAllowOverrides.filter((override) => override.permission_code === permissionCode);
    const denyOverrides = activeScopeDenyOverrides.filter((override) => override.permission_code === permissionCode);
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
  }, [
    activeScopeAllowOverrides,
    activeScopeDenyOverrides,
    canManageOverride,
    isScopeAwarePermission,
    roleTemplatePermissionCodes,
    selectedPermissionScopes,
    selectedRoleDefaultScopeTypes,
    selectedScopeUserIds,
  ]);

  const handlePermissionToggle = useCallback(async (permissionCode: string, nextChecked: boolean) => {
    if (!userId || isPermissionSaving(permissionCode)) {
      return;
    }

    const permissionState = getPermissionState(permissionCode);
    const blockedReason = nextChecked ? permissionState.enableBlockedReason : permissionState.disableBlockedReason;
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }

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
    const isScopeAware = isScopeAwarePermission(permissionCode);
    const scopeRole = normalizedSelectedPermissionRole;
    const overridesToRevoke: UserPermissionOverride[] = [];
    const payloadsToCreate: CreateUserPermissionOverrideRequest[] = [];

    if (!isScopeAware) {
      if (nextChecked) {
        overridesToRevoke.push(...denyOverrides);
        if (!fromTemplate && allowOverrides.length === 0) {
          payloadsToCreate.push({
            permission_code: permissionCode,
            effect: 'ALLOW',
            applies_to_role: scopeRole,
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
            applies_to_role: scopeRole,
            scope_type: 'ALL',
            scope_user_ids: [],
          });
        }
      }
    } else {
      if (currentChecked === nextChecked) {
        return;
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
              applies_to_role: scopeRole,
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
              applies_to_role: scopeRole,
              scope_type: 'SELF',
              scope_user_ids: [],
            });
          }
        }
      } else if (nextChecked) {
        overridesToRevoke.push(...selectedDenyOverrides, ...staleExplicitOverrides);
        missingSelectedAllowScopeTypes.forEach((scopeType) => {
          payloadsToCreate.push({
            permission_code: permissionCode,
            effect: 'ALLOW',
            applies_to_role: scopeRole,
            scope_type: scopeType,
            scope_user_ids: [],
          });
        });
        if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow) {
          payloadsToCreate.push({
            permission_code: permissionCode,
            effect: 'ALLOW',
            applies_to_role: scopeRole,
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
            applies_to_role: scopeRole,
            scope_type: scopeType,
            scope_user_ids: [],
          });
        });
      }
    }

    const uniqueOverridesToRevoke = Array.from(new Map(
      overridesToRevoke
        .filter((override) => override.id > 0)
        .map((override) => [getOverrideSignature(override), override]),
    ).values());

    setSavingPermissionCodes((prev) => [...prev, permissionCode]);
    try {
      if (uniqueOverridesToRevoke.length > 0) {
        await Promise.all(
          uniqueOverridesToRevoke.map((override) =>
            revokeOverride({ userId, overrideId: override.id }),
          ),
        );
      }

      if (payloadsToCreate.length > 0) {
        await Promise.all(
          payloadsToCreate.map((payload) =>
            createOverride({
              userId,
              data: {
                ...payload,
                scope_user_ids: payload.scope_type === 'EXPLICIT_USERS'
                  ? normalizeScopeUserIds(payload.scope_user_ids ?? [])
                  : [],
              },
            }),
          ),
        );
      }

      await refreshUser();
      await refetchUserOverrides();
    } catch (error) {
      showApiError(error);
    } finally {
      setSavingPermissionCodes((prev) => prev.filter((code) => code !== permissionCode));
    }
  }, [
    createOverride,
    getPermissionState,
    isPermissionSaving,
    isScopeAwarePermission,
    normalizedSelectedPermissionRole,
    refetchUserOverrides,
    refreshUser,
    revokeOverride,
    selectedPermissionScopes,
    selectedScopeUserIds,
    userId,
  ]);

  return {
    getPermissionState,
    handlePermissionToggle,
    isPermissionSaving,
  };
};
