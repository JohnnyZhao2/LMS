import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/features/auth/stores/auth-context';
import {
  useCreateUserPermissionOverride,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
  useUserPermissionOverrides,
  useVisiblePermissionCatalog,
} from '@/features/authorization/api/authorization';
import type {
  PermissionOverrideScope,
  UserPermissionOverride,
  RoleCode,
} from '@/types/api';
import type { Department, UserList as UserDetail } from '@/types/common';
import { KeyRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

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
import { useUserPermissionOverrideState } from './use-user-permission-override-state';
import { useUserPermissionScopeState } from './use-user-permission-scope-state';

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
  const canManageUserAuthorization = hasCapability('user.authorize');
  const canViewRoleTemplate =
    hasCapability('authorization.role_template.view')
    || hasCapability('authorization.role_template.update');

  const shouldLoadUserOverrides = Boolean(userId) && canManageUserAuthorization;
  const { data: permissionCatalog = [] } = useVisiblePermissionCatalog(
    'user_authorization',
    canManageUserAuthorization,
  );
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
    { enabled: canManageUserAuthorization },
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
    canManageUserAuthorization && canViewRoleTemplate,
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

  const normalizedSelectedPermissionRole = useMemo<RoleCode>(
    () => previewRoleCodes[0] ?? 'MENTOR',
    [previewRoleCodes],
  );

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
  const scopeAwarePermissionCodeSet = useMemo(
    () => new Set(permissionCatalog.filter((permission) => permission.scope_aware).map((permission) => permission.code)),
    [permissionCatalog],
  );
  const userPermissionOverrides = useMemo<UserPermissionOverride[]>(() => {
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

  const { getPermissionState, handlePermissionToggle, isPermissionSaving } = useUserPermissionOverrideState({
    userId,
    canManageOverride: canManageUserAuthorization,
    normalizedSelectedPermissionRole,
    selectedRoleDefaultScopeTypes,
    selectedPermissionScopes,
    selectedScopeUserIds,
    roleTemplatePermissionCodes,
    userOverrides: userPermissionOverrides,
    isScopeAwarePermission: (permissionCode) => scopeAwarePermissionCodeSet.has(permissionCode),
    createOverride: createUserOverride.mutateAsync,
    revokeOverride: revokeUserOverride.mutateAsync,
    refreshUser,
    refetchUserOverrides,
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
  const scopePoolPermissionCode = useMemo(
    () => activeModulePermissions.find((permission) => permission.scope_aware)?.code ?? null,
    [activeModulePermissions],
  );

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
    scopePermissionCode: scopePoolPermissionCode,
    shouldLoadUserOverrides,
    isLoadingUserOverrides,
    scopeUsers,
    userOverrides: userPermissionOverrides,
    selectedPermissionScopes,
    setSelectedPermissionScopes,
    selectedScopeUserIds,
    setSelectedScopeUserIds,
  });

  useEffect(() => {
    setShowScopeAdjustPanel(false);
  }, [activePermissionModule, setShowScopeAdjustPanel, userId]);

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
  if (!canManageUserAuthorization) {
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
            {activeModulePermissions.some((permission) => permission.scope_aware) ? (
              <div className="mb-3 flex justify-end">
                <div className="w-full max-w-[220px]">
                  <UserPermissionScopePopover
                    open={showScopeAdjustPanel}
                    onOpenChange={setShowScopeAdjustPanel}
                    summary={formatScopeSummaryForDisplay(selectedPermissionScopes, selectedScopeUserIds)}
                    scopeFilterOptions={scopeFilterOptions}
                    scopeUserFilter={scopeUserFilter}
                    onScopeFilterChange={handleScopeFilterChange}
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
            ) : null}
            {activeModulePermissions.length === 0 ? (
              <div className="py-12 text-center text-sm font-medium text-slate-400">当前模块暂无可配置权限</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {activeModulePermissions.map((permission) => {
                  const permissionState = getPermissionState(permission.code);
                  return (
                    <UserPermissionCard
                      key={permission.code}
                      permission={permission}
                      permissionState={permissionState}
                      isSaving={isPermissionSaving(permission.code)}
                      onToggle={(nextChecked) => void handlePermissionToggle(permission.code, nextChecked)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
