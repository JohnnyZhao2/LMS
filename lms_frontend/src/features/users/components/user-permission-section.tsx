import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useCreateUserPermissionOverride,
  usePermissionCatalog,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
  useUserPermissionOverrides,
} from '@/features/authorization/api/authorization';
import { isConfigModuleLockedForRole } from '@/features/authorization/constants/permission-constraints';
import type {
  PermissionOverrideScope,
  UserPermissionOverride,
  RoleCode,
} from '@/types/api';
import type { Department, UserList as UserDetail } from '@/types/common';

import { useUsers } from '../api/get-users';
import { UserPermissionCard } from './user-permission-card';
import { UserPermissionModuleSidebar } from './user-permission-module-sidebar';
import { UserPermissionScopePopover } from './user-permission-scope-popover';
import {
  DEFAULT_ROLE_SCOPE_TYPES,
  normalizeScopeTypes,
  sameScopeTypes,
} from './user-form.utils';
import { normalizeScopeUserIds } from './user-permission-section.helpers';
import { useUserPermissionDraft } from './use-user-permission-draft';
import { useUserPermissionScopeState } from './use-user-permission-scope-state';

interface UserPermissionSectionProps {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  selectedRoleCodes: RoleCode[];
  departmentId?: number;
  isSuperuserAccount: boolean;
  dialogContentElement: HTMLDivElement | null;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
}

export interface UserPermissionSectionHandle {
  hasPendingChanges: () => boolean;
  submitChanges: (targetUserId?: number) => Promise<void>;
}

export const UserPermissionSection = forwardRef<UserPermissionSectionHandle, UserPermissionSectionProps>(({
  userId,
  userDetail,
  departments,
  selectedRoleCodes,
  departmentId,
  isSuperuserAccount,
  dialogContentElement,
  onPendingChangesChange,
}, ref) => {
  const { hasCapability, refreshUser } = useAuth();
  const canManageUserAuthorization = hasCapability('user.authorize');
  const canViewOverride = canManageUserAuthorization;
  const canCreateOverride = canManageUserAuthorization;
  const canRevokeOverride = canManageUserAuthorization;
  const canViewRoleTemplate =
    hasCapability('authorization.role_template.view')
    || hasCapability('authorization.role_template.update');
  const shouldLoadPermissionCatalog = canViewOverride;
  const shouldLoadScopeUsers = canViewOverride;
  const shouldLoadUserOverrides = Boolean(userId) && canViewOverride;

  const { data: permissionCatalog = [] } = usePermissionCatalog(undefined, shouldLoadPermissionCatalog);
  const {
    data: userOverrides = [],
    isLoading: isLoadingUserOverrides,
    refetch: refetchUserOverrides,
  } = useUserPermissionOverrides(
    userId ?? null,
    false,
    shouldLoadUserOverrides,
  );
  const createUserOverride = useCreateUserPermissionOverride();
  const revokeUserOverride = useRevokeUserPermissionOverride();
  const [selectedPermissionModule, setSelectedPermissionModule] = useState('');
  const [selectedPermissionScopes, setSelectedPermissionScopes] = useState<PermissionOverrideScope[]>([]);
  const [selectedScopeUserIds, setSelectedScopeUserIds] = useState<number[]>([]);

  const { data: scopeUsers = [], isLoading: isScopeUsersLoading } = useUsers(
    {},
    { enabled: shouldLoadScopeUsers },
  );

  const previewRoleCodes = useMemo<RoleCode[]>(() => {
    if (isSuperuserAccount) {
      return ['SUPER_ADMIN'];
    }
    return Array.from(new Set(
      selectedRoleCodes.filter((roleCode) => roleCode !== 'STUDENT' && roleCode !== 'SUPER_ADMIN'),
    ));
  }, [selectedRoleCodes, isSuperuserAccount]);
  const hasConfigurablePermissionRoles = previewRoleCodes.length > 0;

  const roleTemplateQueries = useRolePermissionTemplates(
    previewRoleCodes,
    canViewOverride && canViewRoleTemplate,
  );

  const roleTemplatePermissionCodeMap = useMemo(() => {
    const templateMap = new Map<RoleCode, string[]>();
    previewRoleCodes.forEach((roleCode, index) => {
      templateMap.set(roleCode, roleTemplateQueries[index]?.data?.permission_codes ?? []);
    });
    return templateMap;
  }, [previewRoleCodes, roleTemplateQueries]);

  const roleTemplateDefaultScopeMap = useMemo(() => {
    const scopeMap = new Map<RoleCode, PermissionOverrideScope[]>();
    previewRoleCodes.forEach((roleCode, index) => {
      scopeMap.set(
        roleCode,
        roleTemplateQueries[index]?.data?.default_scope_types ?? DEFAULT_ROLE_SCOPE_TYPES[roleCode] ?? [],
      );
    });
    return scopeMap;
  }, [previewRoleCodes, roleTemplateQueries]);

  const normalizedSelectedPermissionRole = useMemo<RoleCode>(() => {
    return previewRoleCodes[0] ?? (isSuperuserAccount ? 'SUPER_ADMIN' : 'MENTOR');
  }, [isSuperuserAccount, previewRoleCodes]);

  const selectedRoleDefaultScopeTypes = useMemo(
    () => normalizeScopeTypes(
      roleTemplateDefaultScopeMap.get(normalizedSelectedPermissionRole)
        ?? DEFAULT_ROLE_SCOPE_TYPES[normalizedSelectedPermissionRole]
        ?? [],
    ),
    [normalizedSelectedPermissionRole, roleTemplateDefaultScopeMap],
  );
  const selectedDepartmentName = useMemo(() => (
    departments.find((department) => (
      department.id === (departmentId ?? userDetail?.department?.id)
    ))?.name ?? userDetail?.department?.name
  ), [departments, departmentId, userDetail?.department?.id, userDetail?.department?.name]);

  const permissionModules = useMemo(
    () => Array.from(new Set(permissionCatalog.map((item) => item.module).filter(Boolean))),
    [permissionCatalog],
  );
  const permissionNameMap = useMemo(() => {
    const nameMap = new Map<string, string>();
    permissionCatalog.forEach((permission) => {
      nameMap.set(permission.code, permission.name);
    });
    return nameMap;
  }, [permissionCatalog]);
  const configPermissionCodeSet = useMemo(
    () => new Set(permissionCatalog
      .filter((permission) => permission.module === 'config')
      .map((permission) => permission.code)),
    [permissionCatalog],
  );
  const isPermissionLockedForSelectedRole = useCallback(
    (permissionCode: string) => (
      isConfigModuleLockedForRole(normalizedSelectedPermissionRole, 'config')
      && configPermissionCodeSet.has(permissionCode)
    ),
    [configPermissionCodeSet, normalizedSelectedPermissionRole],
  );
  const initialDraftOverrides = useMemo<UserPermissionOverride[]>(() => {
    if (!shouldLoadUserOverrides) {
      return [];
    }
    return userOverrides
      .filter((override) => override.is_active && override.applies_to_role !== 'STUDENT')
      .map((override) => ({
        ...override,
        scope_user_ids: normalizeScopeUserIds(override.scope_user_ids),
      }));
  }, [shouldLoadUserOverrides, userOverrides]);

  const roleTemplatePermissionCodes = useMemo(() => {
    if (!canViewRoleTemplate) {
      return new Set<string>();
    }
    return new Set(roleTemplatePermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []);
  }, [canViewRoleTemplate, normalizedSelectedPermissionRole, roleTemplatePermissionCodeMap]);

  const {
    effectiveDraftOverrides,
    isDraftOverridesActive,
    hasDraftChanges,
    getPermissionState,
    handlePermissionToggle,
    submitDraftChanges,
  } = useUserPermissionDraft({
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
    createOverride: createUserOverride.mutateAsync,
    revokeOverride: revokeUserOverride.mutateAsync,
    refreshUser,
    refetchUserOverrides,
  });

  const {
    scopeUserSearch,
    showScopeAdjustPanel,
    scopeUserFilter,
    scopeFilterOptions,
    filteredScopeUsers,
    selectedFilteredScopeCount,
    isAllFilteredScopeUsersSelected,
    hasPartialFilteredScopeSelection,
    setShowScopeAdjustPanel,
    setScopeUserSearch,
    setScopeUserFilter,
    formatScopeSummaryForDisplay,
    handleScopeFilterChange,
    handleFilterDoubleClick,
    toggleSelectAllFilteredScopeUsers,
    applyDefaultScopePreset,
    toggleScopeUser,
    ensureExplicitUsersScopeSelected,
  } = useUserPermissionScopeState({
    userId,
    userDetail,
    departments,
    departmentId,
    selectedDepartmentName,
    hasConfigurablePermissionRoles,
    normalizedSelectedPermissionRole,
    selectedRoleDefaultScopeTypes,
    shouldLoadUserOverrides,
    isLoadingUserOverrides,
    scopeUsers,
    effectiveDraftOverrides,
    initialDraftOverrides,
    isDraftOverridesActive,
    selectedPermissionScopes,
    setSelectedPermissionScopes,
    selectedScopeUserIds,
    setSelectedScopeUserIds,
  });

  const activePermissionModule = useMemo(() => {
    if (selectedPermissionModule && permissionModules.includes(selectedPermissionModule)) {
      return selectedPermissionModule;
    }
    return permissionModules[0] ?? '';
  }, [permissionModules, selectedPermissionModule]);

  const activeModulePermissions = useMemo(
    () => permissionCatalog.filter((permission) => permission.module === activePermissionModule),
    [permissionCatalog, activePermissionModule],
  );

  useImperativeHandle(ref, () => ({
    hasPendingChanges: () => hasDraftChanges,
    submitChanges: submitDraftChanges,
  }), [hasDraftChanges, submitDraftChanges]);

  useEffect(() => {
    onPendingChangesChange?.(hasDraftChanges);
  }, [hasDraftChanges, onPendingChangesChange]);

  const modulePermissionCounts: Record<string, { enabled: number; total: number }> = {};
  permissionModules.forEach((moduleName) => {
    modulePermissionCounts[moduleName] = { enabled: 0, total: 0 };
  });
  permissionCatalog.forEach((permission) => {
    if (!permission.module || !modulePermissionCounts[permission.module]) {
      return;
    }
    modulePermissionCounts[permission.module].total += 1;
    if (getPermissionState(permission.code).checked) {
      modulePermissionCounts[permission.module].enabled += 1;
    }
  });
  const isActiveModuleLockedForRole = isConfigModuleLockedForRole(
    normalizedSelectedPermissionRole,
    activePermissionModule,
  );
  const shouldDisplayPermissionSection = canViewOverride && hasConfigurablePermissionRoles;

  if (!shouldDisplayPermissionSection) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center gap-3 flex-1 justify-end max-w-[320px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">扩展范围</span>
          <UserPermissionScopePopover
            open={showScopeAdjustPanel}
            onOpenChange={setShowScopeAdjustPanel}
            summary={formatScopeSummaryForDisplay(selectedPermissionScopes, selectedScopeUserIds)}
            scopeFilterOptions={scopeFilterOptions}
            scopeUserFilter={scopeUserFilter}
            onScopeFilterChange={handleScopeFilterChange}
            onFilterDoubleClick={handleFilterDoubleClick}
            showReset={!sameScopeTypes(selectedPermissionScopes, selectedRoleDefaultScopeTypes)}
            onReset={() => {
              applyDefaultScopePreset();
              setScopeUserFilter('all');
            }}
            scopeUserSearch={scopeUserSearch}
            onScopeUserSearchChange={setScopeUserSearch}
            isAllFilteredScopeUsersSelected={isAllFilteredScopeUsersSelected}
            hasPartialFilteredScopeSelection={hasPartialFilteredScopeSelection}
            onToggleSelectAllFilteredScopeUsers={toggleSelectAllFilteredScopeUsers}
            selectedFilteredScopeCount={selectedFilteredScopeCount}
            filteredScopeUsers={filteredScopeUsers}
            selectedScopeUserIds={selectedScopeUserIds}
            onToggleScopeUser={toggleScopeUser}
            isExplicitUsersScopeSelected={selectedPermissionScopes.includes('EXPLICIT_USERS')}
            onEnsureExplicitUsersScopeSelected={ensureExplicitUsersScopeSelected}
            isScopeUsersLoading={isScopeUsersLoading}
            dialogContentElement={dialogContentElement}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 items-start relative xl:grid-cols-[200px_1fr]">
        <UserPermissionModuleSidebar
          permissionModules={permissionModules}
          activePermissionModule={activePermissionModule}
          moduleCounts={modulePermissionCounts}
          onSelectModule={setSelectedPermissionModule}
        />

        <div className="relative space-y-4">
          {!canViewRoleTemplate && (
            <div className="px-2">
              <p className="text-[11px] text-slate-400">
                当前账号没有角色模板查看权限，下面仅准确展示用户自定义覆盖。
              </p>
            </div>
          )}

          <div>
            {isActiveModuleLockedForRole && (
              <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-500">
                配置管理模块仅支持在管理员角色下配置，当前角色仅可查看。
              </div>
            )}
            {activeModulePermissions.length === 0 ? (
              <div className="py-12 text-center text-sm font-medium text-slate-400">当前模块暂无可配置权限</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {activeModulePermissions.map((permission) => {
                  const permissionState = getPermissionState(permission.code);
                  const isPermissionLocked = isPermissionLockedForSelectedRole(permission.code);
                  return (
                    <UserPermissionCard
                      key={permission.code}
                      permission={permission}
                      permissionState={permissionState}
                      loading={false}
                      forcedDisabled={isPermissionLocked}
                      canCreateOverride={canCreateOverride}
                      canRevokeOverride={canRevokeOverride}
                      hasValidScopeSelection={
                        selectedPermissionScopes.length > 0
                        && (
                          !selectedPermissionScopes.includes('EXPLICIT_USERS')
                          || selectedScopeUserIds.length > 0
                        )
                      }
                      selectedPermissionScopes={selectedPermissionScopes}
                      selectedScopeUserIds={selectedScopeUserIds}
                      onToggle={(nextChecked) => handlePermissionToggle(permission.code, nextChecked)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {isLoadingUserOverrides && (
          <div className="absolute inset-0 bg-white backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
            <div className="bg-white border border-slate-100 shadow-xl px-6 py-4 rounded-full flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-sm font-bold text-slate-700">正在同步当前权限状态...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

UserPermissionSection.displayName = 'UserPermissionSection';
