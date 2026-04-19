import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  CreateUserPermissionOverrideRequest,
  PermissionCatalogItem,
  PermissionOverrideScope,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { showApiError } from '@/utils/error-handler';

import { applyPermissionSelectionChange } from '@/entities/authorization/utils/permission-dependencies';
import { getOverrideSignature, normalizeScopeUserIds } from './user-permission-section.helpers';
import type { PermissionOverrideEntry, PermissionState } from './user-permission-section.types';
import {
  buildPermissionTogglePlan,
  getRolePermissionOverrideBuckets,
  resolvePermissionState,
} from './user-permission-override.utils';

interface UseUserPermissionOverrideStateParams {
  userId?: number;
  canManageOverride: boolean;
  normalizedSelectedPermissionRole: RoleCode;
  permissionCatalog: PermissionCatalogItem[];
  roleTemplatePermissionCodes: Set<string>;
  userOverrides: PermissionOverrideEntry[];
  isScopeAwarePermission: (permissionCode: string) => boolean;
  getScopeSelectionForPermission: (permissionCode: string) => {
    selectedPermissionScopes: PermissionOverrideScope[];
    selectedScopeUserIds: number[];
  };
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
  permissionCatalog,
  roleTemplatePermissionCodes,
  userOverrides,
  isScopeAwarePermission,
  getScopeSelectionForPermission,
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
    const {
      selectedPermissionScopes,
      selectedScopeUserIds,
    } = getScopeSelectionForPermission(permissionCode);

    return resolvePermissionState({
      allowOverrides: activeScopeAllowOverrides.get(permissionCode) ?? [],
      canManageOverride,
      denyOverrides: activeScopeDenyOverrides.get(permissionCode) ?? [],
      fromTemplate,
      isScopeAware: isScopeAwarePermission(permissionCode),
      selectedPermissionScopes,
      selectedScopeUserIds,
    });
  }, [
    activeScopeAllowOverrides,
    activeScopeDenyOverrides,
    canManageOverride,
    getScopeSelectionForPermission,
    isScopeAwarePermission,
    roleTemplatePermissionCodes,
  ]);

  const handlePermissionToggle = useCallback(async (permissionCode: string, nextChecked: boolean) => {
    if (!userId || isPermissionSaving(permissionCode)) {
      return;
    }

    const currentEnabledCodes = permissionCatalog
      .filter((permission) => getPermissionState(permission.code).checked)
      .map((permission) => permission.code);
    const nextEnabledCodeSet = new Set(applyPermissionSelectionChange({
      currentEnabledCodes,
      nextChecked,
      permissionCatalog,
      permissionCode,
    }));
    const changedPermissions = permissionCatalog.filter((permission) => (
      currentEnabledCodes.includes(permission.code) !== nextEnabledCodeSet.has(permission.code)
    ));
    const overridesToRevoke: PermissionOverrideEntry[] = [];
    const payloadsToCreate: CreateUserPermissionOverrideRequest[] = [];

    for (const changedPermission of changedPermissions) {
      const permissionState = getPermissionState(changedPermission.code);
      const changedNextChecked = nextEnabledCodeSet.has(changedPermission.code);
      const blockedReason = changedNextChecked
        ? permissionState.enableBlockedReason
        : permissionState.disableBlockedReason;
      if (blockedReason) {
        toast.error(`${changedPermission.name}：${blockedReason}`);
        return;
      }

      const plan = buildPermissionTogglePlan({
        nextChecked: changedNextChecked,
        permissionCode: changedPermission.code,
        permissionState,
        roleCode: normalizedSelectedPermissionRole,
      });
      overridesToRevoke.push(...plan.overridesToRevoke);
      payloadsToCreate.push(...plan.payloadsToCreate);
    }

    const uniqueOverridesToRevoke = Array.from(new Map(
      overridesToRevoke
        .filter((override) => override.id > 0)
        .map((override) => [getOverrideSignature(override), override]),
    ).values());
    const uniquePayloadsToCreate = Array.from(new Map(
      payloadsToCreate.map((payload) => [
        [
          payload.permission_code,
          payload.effect,
          payload.applies_to_role ?? '',
          payload.scope_type,
          normalizeScopeUserIds(payload.scope_user_ids ?? []).join(','),
        ].join('|'),
        payload,
      ]),
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

      if (uniquePayloadsToCreate.length > 0) {
        await Promise.all(
          uniquePayloadsToCreate.map((payload) =>
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
    normalizedSelectedPermissionRole,
    permissionCatalog,
    refetchUserOverrides,
    refreshUser,
    revokeOverride,
    userId,
  ]);

  return {
    getPermissionState,
    handlePermissionToggle,
    isPermissionSaving,
  };
};
