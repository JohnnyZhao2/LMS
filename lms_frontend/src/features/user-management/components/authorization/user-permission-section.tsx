import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissionCatalog } from '@/features/user-management/api/authorization/get-permission-catalog';
import { useRolePermissionTemplates } from '@/features/user-management/api/authorization/role-authorization';
import {
  useReplaceUserAuthorization,
  useUserAuthorization,
} from '@/features/user-management/api/authorization/user-authorization';
import type { ScopeType, UserAuthorizationState } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import type { Department, UserList as UserDetail } from '@/types/common';
import { KeyRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  buildPermissionModuleSections,
} from '@/features/user-management/utils/permission-sections';

import { useUsers } from '@/features/user-management/api/users/get-users';
import {
  pickDefaultScopeType,
} from '@/features/user-management/components/authorization/user-form.utils';
import { UserPermissionModuleList } from '@/features/user-management/components/authorization/user-permission-module-list';
import { useUserAuthorizationFormState } from '@/features/user-management/components/authorization/use-user-authorization-form-state';
import { useUserPermissionScopeState } from '@/features/user-management/components/authorization/use-user-permission-scope-state';
import {
  AVAILABLE_SCOPE_TYPES,
  formatScopeSummaryForDisplay as formatPersistedScopeSummary,
  getSelectableScopeUsers,
  normalizeAvailableScopeTypes,
  resolveRoleScopeSelection,
} from '@/features/user-management/components/authorization/user-permission-scope.utils';
import {
  ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS,
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_PERMISSION_UPDATE_PERMISSION,
} from '@/config/authorization-access';

interface UserPermissionSectionProps {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  selectedRoleCodes: RoleCode[];
  selectedRoleCode?: RoleCode | null;
  departmentId?: number;
  isSuperuserAccount: boolean;
  dialogContentElement: HTMLDivElement | null;
}

/**
 * 用户最终授权编辑区：改完立刻生效。
 */
export function UserPermissionSection({
  userId,
  userDetail,
  departments,
  selectedRoleCodes,
  selectedRoleCode,
  departmentId,
  isSuperuserAccount,
  dialogContentElement,
}: UserPermissionSectionProps) {
  const { hasCapability, refreshUser, user } = useAuth();
  const canViewUserAuthorization =
    USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const canManageUserAuthorization = hasCapability(
    USER_PERMISSION_UPDATE_PERMISSION,
  );
  const canViewRoleTemplate =
    ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS.some(hasCapability);

  const shouldLoadAuthorization = Boolean(userId) && canViewUserAuthorization;
  const { data: permissionCatalog = [] } = usePermissionCatalog(
    { view: 'user_authorization' },
    canViewUserAuthorization,
  );
  const {
    data: authorization,
    isLoading: isLoadingAuthorization,
  } = useUserAuthorization(userId ?? null, shouldLoadAuthorization);
  const { mutateAsync: replaceUserAuthorization } = useReplaceUserAuthorization();
  const [openScopeGroupKey, setOpenScopeGroupKey] = useState<string | null>(
    null,
  );

  const { data: scopeUsers = [], isLoading: isScopeUsersLoading } = useUsers(
    { isActive: true },
    { enabled: canViewUserAuthorization },
  );

  const previewRoleCodes = useMemo<RoleCode[]>(
    () =>
      !isSuperuserAccount
      && selectedRoleCode
      && selectedRoleCode !== 'STUDENT'
      && selectedRoleCodes.includes(selectedRoleCode)
        ? [selectedRoleCode]
        : [],
    [isSuperuserAccount, selectedRoleCode, selectedRoleCodes],
  );
  const hasConfigurablePermissionRoles = previewRoleCodes.length > 0;

  const roleTemplateQueries = useRolePermissionTemplates(
    previewRoleCodes,
    canViewUserAuthorization && canViewRoleTemplate,
  );

  const normalizedSelectedPermissionRole = useMemo<RoleCode>(
    () => authorization?.role_code ?? previewRoleCodes[0] ?? 'MENTOR',
    [authorization?.role_code, previewRoleCodes],
  );

  const roleTemplateDefaultScopeByGroup = useMemo(() => {
    const groupMap = new Map<string, ScopeType>();
    const template = roleTemplateQueries[0]?.data;
    template?.scopes.forEach((scope) => {
      groupMap.set(scope.scope_group_key, scope.scope_type);
    });
    return groupMap;
  }, [roleTemplateQueries]);

  const selectedDepartmentName = useMemo(
    () =>
      departments.find(
        (department) =>
          department.id === (departmentId ?? userDetail?.department?.id),
      )?.name ?? userDetail?.department?.name,
    [
      departments,
      departmentId,
      userDetail?.department?.id,
      userDetail?.department?.name,
    ],
  );

  const permissionSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );
  const replaceAuthorization = useCallback(
    async (data: UserAuthorizationState) => {
      const saved = await replaceUserAuthorization({
        userId: userId!,
        data,
      });
      // 仅当改的是当前登录用户时刷新会话能力，避免整树无意义重渲染
      if (user?.id === userId) {
        await refreshUser();
      }
      return saved;
    },
    [refreshUser, replaceUserAuthorization, user?.id, userId],
  );

  const {
    draftState,
    getPermissionState,
    handlePermissionToggle,
    updateScopeSelection,
    getScopeSelection,
    isPermissionSaving,
  } = useUserAuthorizationFormState({
    authorization,
    permissionCatalog,
    canManage: canManageUserAuthorization,
    replaceAuthorization,
  });

  const moduleSectionsBase = useMemo(() => {
    const draftScopes = draftState?.scopes ?? [];
    const enabledPermissionCodes = new Set(draftState?.permissionCodes ?? []);
    return permissionSections.map(({ module, permissions }) => {
      const scopeGroupKeys = Array.from(
        new Set(
          permissions
            .filter((permission) =>
              enabledPermissionCodes.has(permission.code),
            )
            .map((permission) => permission.scope_group_key)
            .filter((scopeGroupKey): scopeGroupKey is string =>
              Boolean(scopeGroupKey),
            ),
        ),
      );
      const scopeGroups = scopeGroupKeys.map((scopeGroupKey) => {
        const scopeGroupPermissions = permissions.filter(
          (permission) => permission.scope_group_key === scopeGroupKey,
        );
        const availableScopeTypes = normalizeAvailableScopeTypes(
          scopeGroupPermissions[0]?.allowed_scope_types ?? AVAILABLE_SCOPE_TYPES,
        );
        const defaultScopeType =
          roleTemplateDefaultScopeByGroup.get(scopeGroupKey)
          ?? pickDefaultScopeType(
            availableScopeTypes,
            normalizedSelectedPermissionRole,
          );
        const selectableScopeUsers = getSelectableScopeUsers(scopeUsers);
        const selectableScopeUserIdSet = new Set(
          selectableScopeUsers.map((scopeUser) => scopeUser.id),
        );
        const scopeSelection = resolveRoleScopeSelection({
          draftScopes,
          scopeGroupKey,
          selectableScopeUserIdSet,
          availableScopeTypes,
        });

        return {
          key: scopeGroupKey,
          defaultScopeType,
          availableScopeTypes,
          scopeSelection,
          scopeSummary: formatPersistedScopeSummary({
            departments,
            scopeType: scopeSelection.scopeType,
            targetUserIds: scopeSelection.targetUserIds,
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
    draftState?.permissionCodes,
    draftState?.scopes,
    normalizedSelectedPermissionRole,
    permissionSections,
    roleTemplateDefaultScopeByGroup,
    scopeUsers,
    selectedDepartmentName,
  ]);

  const activeScopeGroup = useMemo(
    () =>
      moduleSectionsBase
        .flatMap((section) => section.scopeGroups)
        .find((scopeGroup) => scopeGroup.key === openScopeGroupKey) ?? null,
    [moduleSectionsBase, openScopeGroupKey],
  );

  const {
    selectedScopeType,
    selectedScopeUserIds,
    scopeUserSearch,
    showScopeAdjustPanel,
    scopeUserFilter,
    scopeFilterOptions,
    filteredScopeUsers,
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
    availableScopeTypes:
      activeScopeGroup?.availableScopeTypes ?? AVAILABLE_SCOPE_TYPES,
    defaultScopeType: activeScopeGroup?.defaultScopeType ?? null,
    scopeUsers,
    currentSelection: activeScopeGroup
      ? getScopeSelection(activeScopeGroup.key)
      : { scopeType: null, targetUserIds: [] },
    onSelectionChange: (selection) => {
      if (!activeScopeGroup) {
        return;
      }
      updateScopeSelection(activeScopeGroup.key, selection);
    },
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

  if (isLoadingAuthorization || !draftState) {
    return (
      <div className="flex h-full min-h-full items-center justify-center text-sm text-text-muted">
        正在加载用户授权...
      </div>
    );
  }

  return (
    <div>
      <div className="mt-6 space-y-6">
        <div className="relative">
          <UserPermissionModuleList
            filteredScopeUsers={filteredScopeUsers}
            formatScopeSummaryForDisplay={formatScopeSummaryForDisplay}
            getPermissionState={getPermissionState}
            handlePermissionToggle={handlePermissionToggle}
            handleScopeFilterChange={handleScopeFilterChange}
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
            onToggleSelectAllFilteredScopeUsers={
              toggleSelectAllFilteredScopeUsers
            }
            openScopeGroupKey={openScopeGroupKey}
            scopeFilterOptions={scopeFilterOptions}
            scopeUserFilter={scopeUserFilter}
            scopeUserSearch={scopeUserSearch}
            selectedScopeType={selectedScopeType}
            selectedScopeUserIds={selectedScopeUserIds}
            showScopeAdjustPanel={showScopeAdjustPanel}
            dialogContentElement={dialogContentElement}
          />
        </div>
      </div>
    </div>
  );
}
