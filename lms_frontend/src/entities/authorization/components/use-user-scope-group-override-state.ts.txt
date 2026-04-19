import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  CreateUserScopeGroupOverrideRequest,
  PermissionOverrideScope,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { showApiError } from '@/utils/error-handler';

import { normalizeScopeTypes, sameScopeUserIds } from './user-form.utils';
import type { RoleScopeSelection } from './user-permission-scope.utils';
import type { ScopeGroupOverrideEntry } from './user-permission-section.types';

interface UseUserScopeGroupOverrideStateParams {
  userId?: number;
  scopeGroupKey?: string | null;
  normalizedSelectedPermissionRole: RoleCode;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  scopeGroupOverrides: ScopeGroupOverrideEntry[];
  createOverride: (params: {
    userId: number;
    data: CreateUserScopeGroupOverrideRequest;
  }) => Promise<unknown>;
  revokeOverride: (params: {
    userId: number;
    overrideId: number;
  }) => Promise<unknown>;
  refreshUser: () => Promise<unknown>;
  refetchScopeGroupOverrides: () => Promise<unknown>;
}

const buildTargetPayloads = ({
  roleCode,
  scopeGroupKey,
  selectedRoleDefaultScopeTypes,
  selection,
}: {
  roleCode: RoleCode;
  scopeGroupKey: string;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  selection: RoleScopeSelection;
}): CreateUserScopeGroupOverrideRequest[] => {
  const defaultScopeTypes = normalizeScopeTypes(selectedRoleDefaultScopeTypes).filter((scopeType) => scopeType !== 'EXPLICIT_USERS');
  const selectedScopeTypes = normalizeScopeTypes(selection.scopeTypes).filter((scopeType) => scopeType !== 'EXPLICIT_USERS');
  const payloads: CreateUserScopeGroupOverrideRequest[] = [];

  defaultScopeTypes.forEach((scopeType) => {
    if (!selectedScopeTypes.includes(scopeType)) {
      payloads.push({
        scope_group_key: scopeGroupKey,
        effect: 'DENY',
        applies_to_role: roleCode,
        scope_type: scopeType,
        scope_user_ids: [],
      });
    }
  });

  selectedScopeTypes.forEach((scopeType) => {
    if (!defaultScopeTypes.includes(scopeType)) {
      payloads.push({
        scope_group_key: scopeGroupKey,
        effect: 'ALLOW',
        applies_to_role: roleCode,
        scope_type: scopeType,
        scope_user_ids: [],
      });
    }
  });

  if (selection.scopeTypes.includes('EXPLICIT_USERS') && selection.scopeUserIds.length > 0) {
    payloads.push({
      scope_group_key: scopeGroupKey,
      effect: 'ALLOW',
      applies_to_role: roleCode,
      scope_type: 'EXPLICIT_USERS',
      scope_user_ids: Array.from(new Set(selection.scopeUserIds)).sort((left, right) => left - right),
    });
  }

  return payloads;
};

const samePayload = (
  override: ScopeGroupOverrideEntry,
  payload: CreateUserScopeGroupOverrideRequest,
) => (
  override.scopeGroupKey === payload.scope_group_key
  && override.effect === payload.effect
  && override.appliesToRole === (payload.applies_to_role ?? null)
  && override.scopeType === payload.scope_type
  && sameScopeUserIds(override.scopeUserIds, payload.scope_user_ids ?? [])
);

export const useUserScopeGroupOverrideState = ({
  userId,
  scopeGroupKey,
  normalizedSelectedPermissionRole,
  selectedRoleDefaultScopeTypes,
  scopeGroupOverrides,
  createOverride,
  revokeOverride,
  refreshUser,
  refetchScopeGroupOverrides,
}: UseUserScopeGroupOverrideStateParams) => {
  const [isSaving, setIsSaving] = useState(false);

  const activeOverrides = useMemo(
    () => scopeGroupOverrides.filter((override) => (
      override.scopeGroupKey === scopeGroupKey
      && override.appliesToRole === normalizedSelectedPermissionRole
    )),
    [normalizedSelectedPermissionRole, scopeGroupKey, scopeGroupOverrides],
  );

  const persistSelection = useCallback(async (selection: RoleScopeSelection) => {
    if (!userId || !scopeGroupKey || isSaving) {
      return;
    }

    if (
      selection.scopeTypes.includes('EXPLICIT_USERS')
      && selection.scopeUserIds.length === 0
    ) {
      toast.error('请选择至少一个指定用户');
      return;
    }

    const targetPayloads = buildTargetPayloads({
      roleCode: normalizedSelectedPermissionRole,
      scopeGroupKey,
      selectedRoleDefaultScopeTypes,
      selection,
    });

    const sameLength = activeOverrides.length === targetPayloads.length;
    const matchesExactly = sameLength && activeOverrides.every((override) => (
      targetPayloads.some((payload) => samePayload(override, payload))
    ));
    if (matchesExactly) {
      return;
    }

    setIsSaving(true);
    try {
      if (activeOverrides.length > 0) {
        await Promise.all(
          activeOverrides.map((override) => revokeOverride({ userId, overrideId: override.id })),
        );
      }
      if (targetPayloads.length > 0) {
        await Promise.all(
          targetPayloads.map((payload) => createOverride({ userId, data: payload })),
        );
      }
      await refreshUser();
      await refetchScopeGroupOverrides();
    } catch (error) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    activeOverrides,
    createOverride,
    isSaving,
    normalizedSelectedPermissionRole,
    refetchScopeGroupOverrides,
    refreshUser,
    revokeOverride,
    scopeGroupKey,
    selectedRoleDefaultScopeTypes,
    userId,
  ]);

  return {
    isSavingScopeGroup: isSaving,
    persistSelection,
  };
};
