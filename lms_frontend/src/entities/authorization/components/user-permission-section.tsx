import { useMemo } from 'react';
import { useAuth } from '@/session/auth/auth-context';
import {
  useCreateUserPermissionOverride,
  usePermissionCatalog,
  useRevokeUserPermissionOverride,
  useRoleCapabilities,
  useUserPermissionOverrides,
} from '@/entities/authorization/api/authorization';
import type { PermissionOverrideScope } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { KeyRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  buildPermissionModuleSections,
} from '@/entities/authorization/utils/permission-sections';

import { DEFAULT_ROLE_SCOPE_TYPES, formatScopeSummary, normalizeScopeTypes } from './user-form.utils';
import { UserPermissionModuleList } from './user-permission-module-list';
import { mapPermissionOverrideEntry } from './user-permission-section.helpers';
import type { PermissionOverrideEntry } from './user-permission-section.types';
import { useUserPermissionOverrideState } from './use-user-permission-override-state';
import {
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_PERMISSION_UPDATE_PERMISSION,
} from '@/entities/authorization/constants/access';

interface UserPermissionSectionProps {
  userId?: number;
  selectedRoleCodes: RoleCode[];
  selectedRoleCode?: RoleCode | null;
  isSuperuserAccount: boolean;
}

export function UserPermissionSection({
  userId,
  selectedRoleCodes,
  selectedRoleCode,
  isSuperuserAccount,
}: UserPermissionSectionProps) {
  const { hasCapability, refreshUser } = useAuth();
  const canViewUserAuthorization = USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const canManageUserAuthorization = hasCapability(USER_PERMISSION_UPDATE_PERMISSION);

  const shouldLoadUserOverrides = Boolean(userId) && canViewUserAuthorization;
  const { data: permissionCatalog = [] } = usePermissionCatalog(
    { view: 'user_authorization' },
    canViewUserAuthorization,
  );
  const {
    data: userOverrides = [],
    refetch: refetchUserOverrides,
  } = useUserPermissionOverrides(
    userId ?? null,
    shouldLoadUserOverrides,
  );
  const createUserOverride = useCreateUserPermissionOverride();
  const revokeUserOverride = useRevokeUserPermissionOverride();

  const previewRoleCodes = useMemo<RoleCode[]>(() => (
    !isSuperuserAccount
    && selectedRoleCode
    && selectedRoleCode !== 'STUDENT'
    && selectedRoleCodes.includes(selectedRoleCode)
      ? [selectedRoleCode]
      : []
  ), [isSuperuserAccount, selectedRoleCode, selectedRoleCodes]);
  const hasConfigurablePermissionRoles = previewRoleCodes.length > 0;

  const roleCapabilityQueries = useRoleCapabilities(
    previewRoleCodes,
    canViewUserAuthorization,
  );

  const roleCapabilityPermissionCodeMap = useMemo(() => {
    const capabilityMap = new Map<RoleCode, string[]>();
    previewRoleCodes.forEach((roleCode, index) => {
      capabilityMap.set(roleCode, roleCapabilityQueries[index]?.data?.permission_codes ?? []);
    });
    return capabilityMap;
  }, [previewRoleCodes, roleCapabilityQueries]);

  const roleCapabilityScopeGroupMap = useMemo(() => {
    const scopeGroupMap = new Map<RoleCode, Map<string, PermissionOverrideScope[]>>();
    previewRoleCodes.forEach((roleCode, index) => {
      const groupMap = new Map<string, PermissionOverrideScope[]>();
      (roleCapabilityQueries[index]?.data?.scope_groups ?? []).forEach((scopeGroup) => {
        groupMap.set(scopeGroup.key, scopeGroup.default_scope_types);
      });
      scopeGroupMap.set(roleCode, groupMap);
    });
    return scopeGroupMap;
  }, [previewRoleCodes, roleCapabilityQueries]);

  const normalizedSelectedPermissionRole = useMemo<RoleCode>(
    () => previewRoleCodes[0] ?? 'MENTOR',
    [previewRoleCodes],
  );

  const userPermissionOverrides = useMemo<PermissionOverrideEntry[]>(() => {
    if (!shouldLoadUserOverrides) {
      return [];
    }
    return userOverrides
      .filter((override) => override.applies_to_role !== 'STUDENT')
      .map(mapPermissionOverrideEntry);
  }, [shouldLoadUserOverrides, userOverrides]);

  const roleCapabilityPermissionCodes = useMemo(
    () => new Set(roleCapabilityPermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []),
    [normalizedSelectedPermissionRole, roleCapabilityPermissionCodeMap],
  );

  const permissionSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );

  const moduleSections = useMemo(() => (
    permissionSections.map(({ module, permissions }) => {
      const scopeGroupKeys = Array.from(new Set(
        permissions
          .map((permission) => permission.scope_group_key)
          .filter((scopeGroupKey): scopeGroupKey is string => Boolean(scopeGroupKey)),
      ));
      const scopeGroups = scopeGroupKeys.map((scopeGroupKey) => {
        const selectedRoleDefaultScopeTypes = normalizeScopeTypes(
          roleCapabilityScopeGroupMap.get(normalizedSelectedPermissionRole)?.get(scopeGroupKey)
            ?? DEFAULT_ROLE_SCOPE_TYPES[normalizedSelectedPermissionRole]
            ?? [],
        );

        return {
          key: scopeGroupKey,
          scopeSummary: formatScopeSummary(selectedRoleDefaultScopeTypes),
        };
      });

      return {
        module,
        permissions,
        scopeGroups,
      };
    })
  ), [
    normalizedSelectedPermissionRole,
    permissionSections,
    roleCapabilityScopeGroupMap,
  ]);

  const { getPermissionState, handlePermissionToggle, isPermissionSaving } = useUserPermissionOverrideState({
    userId,
    canManageOverride: canManageUserAuthorization,
    normalizedSelectedPermissionRole,
    permissionCatalog,
    roleCapabilityPermissionCodes,
    userOverrides: userPermissionOverrides,
    createOverride: createUserOverride.mutateAsync,
    revokeOverride: revokeUserOverride.mutateAsync,
    refreshUser,
    refetchUserOverrides,
  });

  if (!canViewUserAuthorization) {
    return null;
  }

  if (!hasConfigurablePermissionRoles) {
    return (
      <div className="flex h-full min-h-full items-center justify-center">
        <EmptyState
          icon={KeyRound}
          title="当前仅学员角色"
          description="请先在左侧为该用户分配管理角色，再进行权限配置。"
          className="py-0"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mt-6 space-y-6">
        <div className="relative">
          <UserPermissionModuleList
            getPermissionState={getPermissionState}
            handlePermissionToggle={handlePermissionToggle}
            isPermissionSaving={isPermissionSaving}
            moduleSections={moduleSections}
          />
        </div>
      </div>
    </div>
  );
}
