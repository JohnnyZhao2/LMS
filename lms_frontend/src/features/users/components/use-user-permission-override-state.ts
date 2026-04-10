import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { CreateUserPermissionOverrideRequest, PermissionOverrideScope, UserPermissionOverride } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { showApiError } from '@/utils/error-handler';

import { getOverrideSignature, normalizeScopeUserIds } from './user-permission-section.helpers';
import type { PermissionState } from './user-permission-section.types';
import {
  buildPermissionTogglePlan,
  getRolePermissionOverrideBuckets,
  resolvePermissionState,
} from './user-permission-override.utils';

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
  const { activeScopeAllowOverrides, activeScopeDenyOverrides } = useMemo(
    () => getRolePermissionOverrideBuckets(userOverrides, normalizedSelectedPermissionRole),
    [normalizedSelectedPermissionRole, userOverrides],
  );

  const isPermissionSaving = useCallback(
    (permissionCode: string) => savingPermissionCodes.includes(permissionCode),
    [savingPermissionCodes],
  );

  const getPermissionState = useCallback((permissionCode: string): PermissionState => {
    const fromTemplate = roleTemplatePermissionCodes.has(permissionCode);

    return resolvePermissionState({
      allowOverrides: activeScopeAllowOverrides.get(permissionCode) ?? [],
      canManageOverride,
      denyOverrides: activeScopeDenyOverrides.get(permissionCode) ?? [],
      fromTemplate,
      isScopeAware: isScopeAwarePermission(permissionCode),
      selectedPermissionScopes,
      selectedRoleDefaultScopeTypes,
      selectedScopeUserIds,
    });
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

    const { overridesToRevoke, payloadsToCreate } = buildPermissionTogglePlan({
      isScopeAware: isScopeAwarePermission(permissionCode),
      nextChecked,
      permissionCode,
      permissionState,
      roleCode: normalizedSelectedPermissionRole,
      selectedPermissionScopes,
      selectedScopeUserIds,
    });
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
