import { useMemo } from 'react';
import { useAuth } from '@/session/auth/auth-context';
import {
  useCreateUserPermissionOverride,
  usePermissionCatalog,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
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
  ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS,
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
  const canViewRoleTemplate = ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS.some(hasCapability);

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

  const roleTemplateQueries = useRolePermissionTemplates(
    previewRoleCodes,
    canViewUserAuthorization && canViewRoleTemplate,
  );

  const roleTemplatePermissionCodeMap = useMemo(() => {
    const templateMap = new Map<RoleCode, string[]>();
    previewRoleCodes.forEach((roleCode, index) => {
      templateMap.set(roleCode, roleTemplateQueries[index]?.data?.permission_codes ?? []);
    });
    return templateMap;
  }, [previewRoleCodes, roleTemplateQueries]);

  const roleTemplateScopeGroupMap = useMemo(() => {
    const scopeGroupMap = new Map<RoleCode, Map<string, PermissionOverrideScope[]>>();
    previewRoleCodes.forEach((roleCode, index) => {
      const groupMap = new Map<string, PermissionOverrideScope[]>();
      (roleTemplateQueries[index]?.data?.scope_groups ?? []).forEach((scopeGroup) => {
        groupMap.set(scopeGroup.key, scopeGroup.default_scope_types);
      });
      scopeGroupMap.set(roleCode, groupMap);
    });
    return scopeGroupMap;
  }, [previewRoleCodes, roleTemplateQueries]);

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

  const roleTemplatePermissionCodes = useMemo(() => {
    if (!canViewRoleTemplate) {
      return new Set<string>();
    }
    return new Set(roleTemplatePermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []);
  }, [canViewRoleTemplate, normalizedSelectedPermissionRole, roleTemplatePermissionCodeMap]);

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
          roleTemplateScopeGroupMap.get(normalizedSelectedPermissionRole)?.get(scopeGroupKey)
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
    roleTemplateScopeGroupMap,
  ]);

  const { getPermissionState, handlePermissionToggle, isPermissionSaving } = useUserPermissionOverrideState({
    userId,
    canManageOverride: canManageUserAuthorization,
    normalizedSelectedPermissionRole,
    permissionCatalog,
    roleTemplatePermissionCodes,
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
          description="请在上方用户信息右侧选择一个扩展角色后，再进行权限配置。"
          className="py-0"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mt-6 space-y-6">
        {!canViewRoleTemplate && (
          <div className="px-1">
            <p className="text-[11px] text-slate-400">
              当前账号没有角色模板查看权限，下面仅准确展示用户自定义覆盖。
            </p>
          </div>
        )}

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
