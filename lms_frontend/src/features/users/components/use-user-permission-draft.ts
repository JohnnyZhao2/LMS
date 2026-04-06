import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type {
  CreateUserPermissionOverrideRequest,
  PermissionOverrideScope,
  RoleCode,
  UserPermissionOverride,
} from '@/types/api';

import {
  normalizeScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';
import {
  buildOverrideSignature,
  createUncheckedPermissionState,
  getOverrideSignature,
  normalizeScopeUserIds,
} from './user-permission-section.helpers';
import type { PermissionState } from './user-permission-section.types';

interface UseUserPermissionDraftParams {
  userId?: number;
  hasConfigurablePermissionRoles: boolean;
  canCreateOverride: boolean;
  canRevokeOverride: boolean;
  normalizedSelectedPermissionRole: RoleCode;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
  roleTemplatePermissionCodes: Set<string>;
  permissionNameMap: Map<string, string>;
  initialDraftOverrides: UserPermissionOverride[];
  isPermissionLockedForSelectedRole: (permissionCode: string) => boolean;
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

interface UseUserPermissionDraftResult {
  effectiveDraftOverrides: UserPermissionOverride[];
  isDraftOverridesActive: boolean;
  hasDraftChanges: boolean;
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (permissionCode: string, nextChecked: boolean) => void;
  submitDraftChanges: (targetUserId?: number) => Promise<void>;
}

const matchesSelectedScope = (
  scopeType: PermissionOverrideScope,
  scopeUserIds: number[],
  selectedPermissionScopes: PermissionOverrideScope[],
  selectedScopeUserIds: number[],
) => {
  if (scopeType === 'SELF') {
    return selectedPermissionScopes.length === 0;
  }
  if (scopeType !== 'EXPLICIT_USERS') {
    return selectedPermissionScopes.includes(scopeType);
  }
  return selectedPermissionScopes.includes('EXPLICIT_USERS') && sameScopeUserIds(scopeUserIds, selectedScopeUserIds);
};

export const useUserPermissionDraft = ({
  userId,
  hasConfigurablePermissionRoles,
  canCreateOverride,
  canRevokeOverride,
  normalizedSelectedPermissionRole,
  selectedRoleDefaultScopeTypes,
  selectedPermissionScopes,
  selectedScopeUserIds,
  roleTemplatePermissionCodes,
  permissionNameMap,
  initialDraftOverrides,
  isPermissionLockedForSelectedRole,
  createOverride,
  revokeOverride,
  refreshUser,
  refetchUserOverrides,
}: UseUserPermissionDraftParams): UseUserPermissionDraftResult => {
  const [draftOverrides, setDraftOverrides] = useState<UserPermissionOverride[] | null>(null);
  const nextDraftOverrideIdRef = useRef(-1);
  const effectiveDraftOverrides = draftOverrides ?? initialDraftOverrides;
  const isDraftOverridesActive = draftOverrides !== null;

  const activeScopedOverrides = useMemo(
    () => effectiveDraftOverrides.filter((override) => (
      override.is_active && override.applies_to_role === normalizedSelectedPermissionRole
    )),
    [effectiveDraftOverrides, normalizedSelectedPermissionRole],
  );

  const activeScopeAllowOverrides = useMemo(
    () => activeScopedOverrides.filter((override) => override.effect === 'ALLOW'),
    [activeScopedOverrides],
  );

  const activeScopeDenyOverrides = useMemo(
    () => activeScopedOverrides.filter((override) => override.effect === 'DENY'),
    [activeScopedOverrides],
  );

  const appendDraftOverrides = useCallback((
    currentOverrides: UserPermissionOverride[],
    payloads: CreateUserPermissionOverrideRequest[],
  ): UserPermissionOverride[] => {
    const nextOverrides = [...currentOverrides];
    const existingSignatureSet = new Set(nextOverrides.map(getOverrideSignature));

    payloads.forEach((payload) => {
      const signature = buildOverrideSignature({
        permissionCode: payload.permission_code,
        effect: payload.effect,
        appliesToRole: payload.applies_to_role ?? null,
        scopeType: payload.scope_type,
        scopeUserIds: payload.scope_user_ids ?? [],
      });
      if (existingSignatureSet.has(signature)) {
        return;
      }
      const now = new Date().toISOString();
      nextOverrides.push({
        id: nextDraftOverrideIdRef.current,
        permission_code: payload.permission_code,
        permission_name: permissionNameMap.get(payload.permission_code) ?? payload.permission_code,
        effect: payload.effect,
        applies_to_role: payload.applies_to_role ?? null,
        scope_type: payload.scope_type,
        scope_user_ids: normalizeScopeUserIds(payload.scope_user_ids ?? []),
        reason: payload.reason ?? '',
        expires_at: payload.expires_at ?? null,
        is_active: true,
        granted_by_name: null,
        revoked_by_name: null,
        revoked_at: null,
        revoked_reason: '',
        created_at: now,
        updated_at: now,
      });
      existingSignatureSet.add(signature);
      nextDraftOverrideIdRef.current -= 1;
    });

    return nextOverrides;
  }, [permissionNameMap]);

  const getPermissionState = useCallback((permissionCode: string): PermissionState => {
    if (isPermissionLockedForSelectedRole(permissionCode)) {
      return createUncheckedPermissionState();
    }

    const fromTemplate = roleTemplatePermissionCodes.has(permissionCode);
    const allowOverrides = activeScopeAllowOverrides.filter((override) => override.permission_code === permissionCode);
    const denyOverrides = activeScopeDenyOverrides.filter((override) => override.permission_code === permissionCode);
    const selectedStandardScopeTypes: PermissionOverrideScope[] = normalizeScopeTypes(
      selectedPermissionScopes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS'),
    );
    const isSelfOnlySelection = selectedPermissionScopes.length === 0;
    const inheritedScopeTypes: PermissionOverrideScope[] = fromTemplate
      ? selectedRoleDefaultScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS')
      : [];

    const isStandardScopeGranted = (scopeType: PermissionOverrideScope) => {
      const hasDenyOverride = denyOverrides.some((override) => override.scope_type === scopeType);
      if (hasDenyOverride) {
        return false;
      }
      if (inheritedScopeTypes.includes(scopeType)) {
        return true;
      }
      return allowOverrides.some((override) => override.scope_type === scopeType);
    };

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

    return {
      checked,
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
    isPermissionLockedForSelectedRole,
    roleTemplatePermissionCodes,
    selectedPermissionScopes,
    selectedRoleDefaultScopeTypes,
    selectedScopeUserIds,
  ]);

  const handlePermissionToggle = useCallback((permissionCode: string, nextChecked: boolean) => {
    if (!hasConfigurablePermissionRoles) {
      toast.error('请先分配管理角色，再配置用户权限');
      return;
    }
    if (isPermissionLockedForSelectedRole(permissionCode)) {
      toast.error('配置管理权限仅支持在管理员角色下配置');
      return;
    }

    if (selectedPermissionScopes.length === 0) {
      toast.error('请先选择扩展范围');
      return;
    }

    if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length === 0) {
      toast.error('请选择至少一个指定用户');
      return;
    }

    const scopeRole = normalizedSelectedPermissionRole;
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
    } = getPermissionState(permissionCode);
    const staleExplicitOverrides = [...allowOverrides, ...denyOverrides].filter((override) => (
      override.scope_type === 'EXPLICIT_USERS'
      && (
        !selectedPermissionScopes.includes('EXPLICIT_USERS')
        || !sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds)
      )
    ));
    const needsRevokeStaleExplicitWhenEnable = staleExplicitOverrides.length > 0;

    if (currentChecked === nextChecked) return;

    const needsCreateWhenEnable = missingSelectedAllowScopeTypes.length > 0
      || (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow);
    const needsCreateWhenDisable = fromTemplate && inheritedSelectedScopeTypes.length > 0;
    const needsRevokeWhenEnable = selectedDenyOverrides.length > 0;
    const needsRevokeWhenDisable = selectedAllowOverrides.length > 0;

    if (nextChecked && needsRevokeWhenEnable && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法启用该权限');
      return;
    }
    if (nextChecked && needsRevokeStaleExplicitWhenEnable && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法启用该权限');
      return;
    }
    if (nextChecked && needsCreateWhenEnable && !canCreateOverride) {
      toast.error('当前账号没有创建权限，无法启用该权限');
      return;
    }
    if (!nextChecked && needsRevokeWhenDisable && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法禁用该权限');
      return;
    }
    if (!nextChecked && needsCreateWhenDisable && !canCreateOverride) {
      toast.error('当前账号没有创建权限，无法禁用该权限');
      return;
    }

    const overrideSignaturesToRemove = new Set<string>();
    const payloadsToAdd: CreateUserPermissionOverrideRequest[] = [];

    if (isSelfOnlySelection) {
      if (nextChecked) {
        selectedDenyOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
        if (!fromTemplate && !hasSelfAllow && !hasNonSelfAllow) {
          payloadsToAdd.push({
            permission_code: permissionCode,
            effect: 'ALLOW',
            applies_to_role: scopeRole,
            scope_type: 'SELF',
            scope_user_ids: [],
          });
        }
      } else {
        selectedAllowOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
        if (fromTemplate || hasNonSelfAllow) {
          payloadsToAdd.push({
            permission_code: permissionCode,
            effect: 'DENY',
            applies_to_role: scopeRole,
            scope_type: 'SELF',
            scope_user_ids: [],
          });
        }
      }
    } else if (nextChecked) {
      selectedDenyOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
      staleExplicitOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
      missingSelectedAllowScopeTypes.forEach((scopeType) => {
        payloadsToAdd.push({
          permission_code: permissionCode,
          effect: 'ALLOW',
          applies_to_role: scopeRole,
          scope_type: scopeType,
          scope_user_ids: [],
        });
      });
      if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow) {
        payloadsToAdd.push({
          permission_code: permissionCode,
          effect: 'ALLOW',
          applies_to_role: scopeRole,
          scope_type: 'EXPLICIT_USERS',
          scope_user_ids: normalizeScopeUserIds(selectedScopeUserIds),
        });
      }
    } else {
      selectedAllowOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
      inheritedSelectedScopeTypes.forEach((scopeType) => {
        payloadsToAdd.push({
          permission_code: permissionCode,
          effect: 'DENY',
          applies_to_role: scopeRole,
          scope_type: scopeType,
          scope_user_ids: [],
        });
      });
    }

    setDraftOverrides((prev) => {
      const baseOverrides = prev ?? initialDraftOverrides;
      const afterRemove = baseOverrides.filter((override) => !overrideSignaturesToRemove.has(getOverrideSignature(override)));
      return appendDraftOverrides(afterRemove, payloadsToAdd);
    });
  }, [
    appendDraftOverrides,
    canCreateOverride,
    canRevokeOverride,
    getPermissionState,
    hasConfigurablePermissionRoles,
    initialDraftOverrides,
    isPermissionLockedForSelectedRole,
    normalizedSelectedPermissionRole,
    selectedPermissionScopes,
    selectedScopeUserIds,
  ]);

  const hasDraftChanges = useMemo(() => {
    const initialSignatureSet = new Set(initialDraftOverrides.map(getOverrideSignature));
    const draftSignatureSet = new Set(effectiveDraftOverrides.map(getOverrideSignature));
    if (initialSignatureSet.size !== draftSignatureSet.size) {
      return true;
    }
    return Array.from(initialSignatureSet).some((signature) => !draftSignatureSet.has(signature));
  }, [effectiveDraftOverrides, initialDraftOverrides]);

  const submitDraftChanges = useCallback(async (targetUserId?: number) => {
    const resolvedUserId = targetUserId ?? userId;
    if (!resolvedUserId || !hasDraftChanges) {
      return;
    }

    const initialBySignature = new Map(initialDraftOverrides.map((override) => [getOverrideSignature(override), override]));
    const draftBySignature = new Map(effectiveDraftOverrides.map((override) => [getOverrideSignature(override), override]));

    const overridesToRevoke = Array.from(initialBySignature.entries())
      .filter(([signature]) => !draftBySignature.has(signature))
      .map(([, override]) => override)
      .filter((override) => override.id > 0);
    const overridesToCreate = Array.from(draftBySignature.entries())
      .filter(([signature]) => !initialBySignature.has(signature))
      .map(([, override]) => override);

    if (overridesToRevoke.length > 0 && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法提交权限草稿');
      throw new Error('missing revoke permission');
    }
    if (overridesToCreate.length > 0 && !canCreateOverride) {
      toast.error('当前账号没有创建权限，无法提交权限草稿');
      throw new Error('missing create permission');
    }

    await Promise.all(
      overridesToRevoke.map((override) =>
        revokeOverride({ userId: resolvedUserId, overrideId: override.id }),
      ),
    );
    await Promise.all(
      overridesToCreate.map((override) =>
        createOverride({
          userId: resolvedUserId,
          data: {
            permission_code: override.permission_code,
            effect: override.effect,
            applies_to_role: override.applies_to_role,
            scope_type: override.scope_type,
            scope_user_ids: override.scope_type === 'EXPLICIT_USERS' ? normalizeScopeUserIds(override.scope_user_ids) : [],
            reason: override.reason,
            expires_at: override.expires_at,
          },
        }),
      ),
    );
    await refreshUser();
    await refetchUserOverrides();
    setDraftOverrides(null);
    nextDraftOverrideIdRef.current = -1;
  }, [
    canCreateOverride,
    canRevokeOverride,
    createOverride,
    effectiveDraftOverrides,
    hasDraftChanges,
    initialDraftOverrides,
    refetchUserOverrides,
    refreshUser,
    revokeOverride,
    userId,
  ]);

  return {
    effectiveDraftOverrides,
    isDraftOverridesActive,
    hasDraftChanges,
    getPermissionState,
    handlePermissionToggle,
    submitDraftChanges,
  };
};
