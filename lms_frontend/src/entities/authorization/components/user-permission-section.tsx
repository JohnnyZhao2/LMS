import {
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/session/auth/auth-context';
import {
  useCreateUserPermissionOverride,
  useCreateUserScopeGroupOverride,
  usePermissionCatalog,
  useRevokeUserScopeGroupOverride,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
  useUserPermissionOverrides,
  useUserScopeGroupOverrides,
} from '@/entities/authorization/api/authorization';
import type { PermissionOverrideScope } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import type { Department, UserList as UserDetail } from '@/types/common';
import { KeyRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  buildPermissionModuleSections,
  buildScopeAwarePermissionCodeSet,
  buildScopeGroupPermissionCodeMap,
} from '@/entities/authorization/utils/permission-sections';

import { useUsers } from '@/entities/user/api/get-users';
import { DEFAULT_ROLE_SCOPE_TYPES, normalizeScopeTypes } from './user-form.utils';
import { UserPermissionModuleList } from './user-permission-module-list';
import {
  mapPermissionOverrideEntry,
  mapScopeGroupOverrideEntry,
} from './user-permission-section.helpers';
import type { PermissionOverrideEntry, ScopeGroupOverrideEntry } from './user-permission-section.types';
import { useUserPermissionOverrideState } from './use-user-permission-override-state';
import { useUserPermissionScopeState } from './use-user-permission-scope-state';
import { useUserScopeGroupOverrideState } from './use-user-scope-group-override-state';
import {
  AVAILABLE_SCOPE_TYPES,
  formatScopeSummaryForDisplay as formatPersistedScopeSummary,
  getPresetMatchedScopeUserIds,
  getSelectableScopeUsers,
  normalizeAvailableScopeTypes,
  resolveRoleScopeSelection,
  STUDENT_ONLY_SCOPE_PERMISSION_CODES,
} from './user-permission-scope.utils';
import {
  ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS,
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_PERMISSION_UPDATE_PERMISSION,
} from '@/entities/authorization/constants/access';

interface UserPermissionSectionProps {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  selectedRoleCodes: RoleCode[];
  departmentId?: number;
  isSuperuserAccount: boolean;
  dialogContentElement: HTMLDivElement | null;
}

export function UserPermissionSection({
  userId,
  userDetail,
  departments,
  selectedRoleCodes,
  departmentId,
  isSuperuserAccount,
  dialogContentElement,
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
  const {
    data: scopeGroupOverrides = [],
    refetch: refetchScopeGroupOverrides,
  } = useUserScopeGroupOverrides(
    userId ?? null,
    shouldLoadUserOverrides,
  );
  const createUserOverride = useCreateUserPermissionOverride();
  const revokeUserOverride = useRevokeUserPermissionOverride();
  const createUserScopeGroupOverride = useCreateUserScopeGroupOverride();
  const revokeUserScopeGroupOverride = useRevokeUserScopeGroupOverride();
  const [openScopeGroupKey, setOpenScopeGroupKey] = useState<string | null>(null);

  const { data: scopeUsers = [], isLoading: isScopeUsersLoading } = useUsers(
    { isActive: true },
    { enabled: canViewUserAuthorization },
  );

  const previewRoleCodes = useMemo<RoleCode[]>(() => {
    if (isSuperuserAccount) {
      return [];
    }
    return Array.from(new Set(
      selectedRoleCodes.filter((roleCode) => roleCode !== 'STUDENT' && roleCode !== 'SUPER_ADMIN'),
    ));
  }, [selectedRoleCodes, isSuperuserAccount]);
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

  const selectedDepartmentName = useMemo(() => (
    departments.find((department) => (
      department.id === (departmentId ?? userDetail?.department?.id)
    ))?.name ?? userDetail?.department?.name
  ), [departments, departmentId, userDetail?.department?.id, userDetail?.department?.name]);

  const scopeGroupPermissionCodeMap = useMemo(
    () => buildScopeGroupPermissionCodeMap(permissionCatalog),
    [permissionCatalog],
  );
  const scopeAwarePermissionCodeSet = useMemo(
    () => buildScopeAwarePermissionCodeSet(permissionCatalog),
    [permissionCatalog],
  );
  const userPermissionOverrides = useMemo<PermissionOverrideEntry[]>(() => {
    if (!shouldLoadUserOverrides) {
      return [];
    }
    return userOverrides
      .filter((override) => override.applies_to_role !== 'STUDENT')
      .map(mapPermissionOverrideEntry);
  }, [shouldLoadUserOverrides, userOverrides]);
  const userScopeGroupOverrides = useMemo<ScopeGroupOverrideEntry[]>(() => {
    if (!shouldLoadUserOverrides) {
      return [];
    }
    return scopeGroupOverrides
      .filter((override) => override.applies_to_role !== 'STUDENT')
      .map(mapScopeGroupOverrideEntry);
  }, [scopeGroupOverrides, shouldLoadUserOverrides]);

  const roleTemplatePermissionCodes = useMemo(() => {
    if (!canViewRoleTemplate) {
      return new Set<string>();
    }
    return new Set(roleTemplatePermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []);
  }, [canViewRoleTemplate, normalizedSelectedPermissionRole, roleTemplatePermissionCodeMap]);
  const ownerUserId = userId ?? userDetail?.id ?? null;
  const ownerDepartmentId = departmentId ?? userDetail?.department?.id ?? null;
  const permissionSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );
  const moduleSectionsBase = useMemo(() => {
    return permissionSections
      .map(({ module, permissions }) => {
        const scopeGroupKeys = Array.from(new Set(
          permissions
            .map((permission) => permission.scope_group_key)
            .filter((scopeGroupKey): scopeGroupKey is string => Boolean(scopeGroupKey)),
        ));
        const scopeGroups = scopeGroupKeys.map((scopeGroupKey) => {
          const scopeGroupPermissions = permissions.filter((permission) => (
            permission.scope_group_key === scopeGroupKey
          ));
          const scopeAwarePermissionCodes = scopeGroupPermissions
            .filter((permission) => permission.scope_aware)
            .map((permission) => permission.code);
          const scopePoolPermissionCode = (
            scopeGroupPermissionCodeMap.get(scopeGroupKey) ?? []
          ).find((permissionCode) => scopeAwarePermissionCodes.includes(permissionCode))
            ?? scopeGroupPermissions.find((permission) => permission.scope_aware)?.code
            ?? scopeGroupPermissions[0]?.code
            ?? null;
          const selectedRoleDefaultScopeTypes = normalizeScopeTypes(
            roleTemplateScopeGroupMap.get(normalizedSelectedPermissionRole)?.get(scopeGroupKey)
              ?? DEFAULT_ROLE_SCOPE_TYPES[normalizedSelectedPermissionRole]
              ?? [],
          );
          const availableScopeTypes = normalizeAvailableScopeTypes(
            scopeGroupPermissions[0]?.allowed_scope_types ?? AVAILABLE_SCOPE_TYPES,
          );
          const shouldRestrictToStudents = Boolean(
            scopePoolPermissionCode && STUDENT_ONLY_SCOPE_PERMISSION_CODES.has(scopePoolPermissionCode),
          );
          const selectableScopeUsers = getSelectableScopeUsers(scopeUsers, shouldRestrictToStudents);
          const selectableScopeUserIdSet = new Set(selectableScopeUsers.map((scopeUser) => scopeUser.id));
          const getPresetMatchedScopeUserIdsForSelection = (scopeTypes: PermissionOverrideScope[]) => getPresetMatchedScopeUserIds({
            departmentId: ownerDepartmentId,
            scopeTypes,
            selectableScopeUsers,
            userId: ownerUserId,
          });
          const scopeSelection = resolveRoleScopeSelection({
            cachedSelection: undefined,
            getPresetMatchedScopeUserIdsForSelection,
            scopeGroupKey,
            roleCode: normalizedSelectedPermissionRole,
            selectableScopeUserIdSet,
            selectedRoleDefaultScopeTypes,
            scopeGroupOverrides: userScopeGroupOverrides,
            availableScopeTypes,
          });

          return {
            key: scopeGroupKey,
            scopePoolPermissionCode,
            selectedRoleDefaultScopeTypes,
            availableScopeTypes,
            scopeSelection,
            scopeSummary: formatPersistedScopeSummary({
              departments,
              getPresetMatchedScopeUserIdsForSelection,
              scopeTypes: scopeSelection.scopeTypes,
              scopeUserIds: scopeSelection.scopeUserIds,
              selectableScopeUsers,
              selectedDepartmentName,
            }),
          };
        });

        return {
          module,
          permissions,
          scopeGroups,
        };
      });
  }, [
    departments,
    normalizedSelectedPermissionRole,
    ownerDepartmentId,
    ownerUserId,
    permissionSections,
    roleTemplateScopeGroupMap,
    scopeGroupPermissionCodeMap,
    scopeUsers,
    selectedDepartmentName,
    userScopeGroupOverrides,
  ]);
  const activeScopeGroup = useMemo(
    () => moduleSectionsBase
      .flatMap((section) => section.scopeGroups)
      .find((scopeGroup) => scopeGroup.key === openScopeGroupKey) ?? null,
    [moduleSectionsBase, openScopeGroupKey],
  );
  const { persistSelection } = useUserScopeGroupOverrideState({
    userId,
    scopeGroupKey: activeScopeGroup?.key,
    normalizedSelectedPermissionRole,
    selectedRoleDefaultScopeTypes: activeScopeGroup?.selectedRoleDefaultScopeTypes ?? [],
    scopeGroupOverrides: userScopeGroupOverrides,
    createOverride: createUserScopeGroupOverride.mutateAsync,
    revokeOverride: revokeUserScopeGroupOverride.mutateAsync,
    refreshUser,
    refetchScopeGroupOverrides,
  });

  const {
    selectedPermissionScopes,
    selectedScopeUserIds,
    scopeUserSearch,
    showScopeAdjustPanel,
    scopeUserFilter,
    scopeFilterOptions,
    filteredScopeUsers,
    selectedFilteredScopeCount,
    isAllFilteredScopeUsersSelected,
    hasPartialFilteredScopeSelection,
    availableScopeTypes,
    setShowScopeAdjustPanel,
    setScopeUserSearch,
    setScopeUserFilter,
    formatScopeSummaryForDisplay,
    handleScopeFilterChange,
    toggleSelectAllFilteredScopeUsers,
    applyDefaultScopePreset,
    selectPresetScope,
    toggleScopeUser,
  } = useUserPermissionScopeState({
    userId,
    userDetail,
    departments,
    departmentId,
    selectedDepartmentName,
    hasConfigurablePermissionRoles,
    normalizedSelectedPermissionRole,
    selectedRoleDefaultScopeTypes: activeScopeGroup?.selectedRoleDefaultScopeTypes ?? [],
    availableScopeTypes: activeScopeGroup?.availableScopeTypes ?? AVAILABLE_SCOPE_TYPES,
    scopeGroupKey: activeScopeGroup?.key ?? undefined,
    scopePermissionCode: activeScopeGroup?.scopePoolPermissionCode ?? null,
    scopeUsers,
    scopeGroupOverrides: userScopeGroupOverrides,
    onSelectionChange: persistSelection,
  });

  const { getPermissionState, handlePermissionToggle, isPermissionSaving } = useUserPermissionOverrideState({
    userId,
    canManageOverride: canManageUserAuthorization,
    normalizedSelectedPermissionRole,
    permissionCatalog,
    roleTemplatePermissionCodes,
    userOverrides: userPermissionOverrides,
    isScopeAwarePermission: (permissionCode) => scopeAwarePermissionCodeSet.has(permissionCode),
    getScopeSelectionForPermission: (permissionCode) => {
      const scopeGroupKey = permissionCatalog.find((permission) => (
        permission.code === permissionCode
      ))?.scope_group_key;
      const scopeSelection = moduleSectionsBase
        .flatMap((section) => section.scopeGroups)
        .find((scopeGroup) => scopeGroup.key === scopeGroupKey)
        ?.scopeSelection;

      return {
        selectedPermissionScopes: scopeSelection?.scopeTypes ?? [],
        selectedScopeUserIds: scopeSelection?.scopeUserIds ?? [],
      };
    },
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
            activeScopeGroup={activeScopeGroup}
            availableScopeTypes={availableScopeTypes}
            dialogContentElement={dialogContentElement}
            filteredScopeUsers={filteredScopeUsers}
            formatScopeSummaryForDisplay={formatScopeSummaryForDisplay}
            getPermissionState={getPermissionState}
            handlePermissionToggle={handlePermissionToggle}
            handleScopeFilterChange={handleScopeFilterChange}
            hasPartialFilteredScopeSelection={hasPartialFilteredScopeSelection}
            isAllFilteredScopeUsersSelected={isAllFilteredScopeUsersSelected}
            isPermissionSaving={isPermissionSaving}
            isScopeUsersLoading={isScopeUsersLoading}
            moduleSections={moduleSectionsBase}
            onApplyDefaultScopePreset={applyDefaultScopePreset}
            onOpenScopeGroupChange={setOpenScopeGroupKey}
            onScopeUserSearchChange={setScopeUserSearch}
            onSelectPresetScope={selectPresetScope}
            onSetScopeUserFilter={setScopeUserFilter}
            onSetShowScopeAdjustPanel={setShowScopeAdjustPanel}
            onToggleScopeUser={toggleScopeUser}
            onToggleSelectAllFilteredScopeUsers={toggleSelectAllFilteredScopeUsers}
            openScopeGroupKey={openScopeGroupKey}
            scopeFilterOptions={scopeFilterOptions}
            scopeUserFilter={scopeUserFilter}
            scopeUserSearch={scopeUserSearch}
            selectedFilteredScopeCount={selectedFilteredScopeCount}
            selectedPermissionScopes={selectedPermissionScopes}
            selectedScopeUserIds={selectedScopeUserIds}
            showScopeAdjustPanel={showScopeAdjustPanel}
          />
        </div>
      </div>
    </div>
  );
}
