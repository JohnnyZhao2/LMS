import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { isAllowedDepartmentCode, useDepartments, useRoles, useUserDetail, useUsers } from '@/entities/user/api/get-users';
import { useAssignRoles } from '@/entities/user/api/manage-users';
import { useAuth } from '@/session/auth/auth-context';
import {
  useRevokeUserPermissionOverride,
  useRevokeUserScopeGroupOverride,
  useUserPermissionOverrides,
  useUserScopeGroupOverrides,
} from '@/entities/authorization/api/authorization';
import { UserPermissionWorkbench } from '@/entities/authorization/components/user-permission-workbench';
import { ASSIGNABLE_ROLES } from '@/lib/role-config';
import { showApiError } from '@/utils/error-handler';
import { applyPermissionSelectionChange } from '@/entities/authorization/utils/permission-dependencies';
import { buildPermissionModuleSections } from '@/entities/authorization/utils/permission-sections';
import { PermissionModuleSections } from '@/entities/authorization/components/permission-module-sections';
import { PermissionToggleCard } from '@/entities/authorization/components/permission-toggle-card';
import { RoleTemplateMemberPanel } from './role-template-member-panel';
import type { UserList } from '@/types/common';
import {
  getManagedRoleCodes,
  getSelectedBusinessRoleCode,
} from '@/entities/authorization/utils/user-role-assignment';

interface RolePermissionTemplatePanelProps {
  canUpdateRoleTemplate: boolean;
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  permissionCodesByRole: Partial<Record<RoleCode, string[]>>;
  onChangeCodes: (roleCode: RoleCode, nextCodes: string[]) => void;
  isLoadingTemplate: boolean;
  savingRoleCodes: RoleCode[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

export const RolePermissionTemplatePanel: React.FC<RolePermissionTemplatePanelProps> = ({
  canUpdateRoleTemplate,
  roleCodes,
  permissionCatalog,
  permissionCodesByRole,
  onChangeCodes,
  isLoadingTemplate,
  savingRoleCodes,
  initialRoleCode = null,
  initialSelectedUserId = null,
}) => {
  const { hasCapability, refreshUser } = useAuth();
  const canManageRoleMembers = hasCapability('user.authorize');
  const [activeRole, setActiveRole] = useState<RoleCode | null>(initialRoleCode);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialRoleCode && initialRoleCode !== 'STUDENT' ? initialSelectedUserId : null,
  );
  const [workbenchElement, setWorkbenchElement] = useState<HTMLDivElement | null>(null);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResettingOverrides, setIsResettingOverrides] = useState(false);
  const assignRoles = useAssignRoles();
  const revokeUserOverride = useRevokeUserPermissionOverride();
  const revokeUserScopeGroupOverride = useRevokeUserScopeGroupOverride();

  const resolvedActiveRole = useMemo(
    () => (activeRole && roleCodes.includes(activeRole) ? activeRole : roleCodes[0] ?? null),
    [activeRole, roleCodes],
  );
  const selectedRolePermissionCodes = useMemo(
    () => (resolvedActiveRole ? (permissionCodesByRole[resolvedActiveRole] ?? []) : []),
    [permissionCodesByRole, resolvedActiveRole],
  );
  const selectedRolePermissionCodeSet = useMemo(
    () => new Set(selectedRolePermissionCodes),
    [selectedRolePermissionCodes],
  );
  const permissionSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );
  const isSavingCurrentRole = resolvedActiveRole ? savingRoleCodes.includes(resolvedActiveRole) : false;
  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    {},
    { enabled: Boolean(resolvedActiveRole) },
  );
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
    refetch: refetchSelectedUserDetail,
  } = useUserDetail(selectedUserId ?? 0);
  const {
    data: selectedUserPermissionOverrides = [],
    refetch: refetchSelectedUserPermissionOverrides,
  } = useUserPermissionOverrides(selectedUserId, false, Boolean(selectedUserId));
  const {
    data: selectedUserScopeGroupOverrides = [],
    refetch: refetchSelectedUserScopeGroupOverrides,
  } = useUserScopeGroupOverrides(selectedUserId, false, Boolean(selectedUserId));
  const roleNameMap = useMemo(
    () => new Map(roles.map((role) => [role.code, role.name])),
    [roles],
  );
  const roleMembers = useMemo(
    () => allVisibleUsers
      .filter((user) => user.roles.some((role) => role.code === resolvedActiveRole))
      .filter((user) => {
        const keyword = deferredMemberSearch.trim().toLowerCase();
        if (!keyword) {
          return true;
        }
        return (
          user.username.toLowerCase().includes(keyword)
          || user.employee_id.toLowerCase().includes(keyword)
        );
      })
      .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN')),
    [allVisibleUsers, deferredMemberSearch, resolvedActiveRole],
  );
  const membersByRole = useMemo(
    () => Object.fromEntries(
      roleCodes.map((roleCode) => [
        roleCode,
        allVisibleUsers
          .filter((user) => user.roles.some((role) => role.code === roleCode))
          .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN')),
      ]),
    ) as Partial<Record<RoleCode, UserList[]>>,
    [allVisibleUsers, roleCodes],
  );
  const groupedMembersByRole = useMemo(
    () => ({
      ...membersByRole,
      [resolvedActiveRole]: roleMembers,
    }),
    [membersByRole, resolvedActiveRole, roleMembers],
  );
  const candidateUsers = useMemo(
    () => {
      const hasActiveTeamManager = allVisibleUsers.some((user) => (
        user.is_active && user.roles.some((role) => role.code === 'TEAM_MANAGER')
      ));
      const occupiedDeptManagerDepartmentIds = new Set(
        allVisibleUsers
          .filter((user) => (
            user.is_active
            && user.roles.some((role) => role.code === 'DEPT_MANAGER')
            && isAllowedDepartmentCode(user.department?.code)
          ))
          .map((user) => user.department?.id)
          .filter((departmentId): departmentId is number => Boolean(departmentId)),
      );

      return allVisibleUsers
        .filter((user) => !user.is_superuser)
        .filter((user) => !user.roles.some((role) => role.code === resolvedActiveRole))
        .filter((user) => user.roles.every((role) => !ASSIGNABLE_ROLES.includes(role.code as RoleCode)))
        .filter((user) => isAllowedDepartmentCode(user.department?.code))
        .filter((user) => {
          if (resolvedActiveRole === 'TEAM_MANAGER') {
            return !hasActiveTeamManager;
          }
          if (resolvedActiveRole === 'DEPT_MANAGER') {
            return Boolean(user.department?.id) && !occupiedDeptManagerDepartmentIds.has(user.department.id);
          }
          return true;
        })
        .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN'));
    },
    [allVisibleUsers, resolvedActiveRole],
  );
  const isViewingUserOverrides = Boolean(selectedUserId);
  const selectedUserRoleCodes = useMemo(
    () => selectedUserDetail?.roles.map((role) => role.code as RoleCode) ?? [],
    [selectedUserDetail],
  );
  const selectedBusinessRoleCode = useMemo<RoleCode | null>(
    () => getSelectedBusinessRoleCode(selectedUserDetail?.roles ?? []),
    [selectedUserDetail],
  );
  const currentRolePermissionOverrides = useMemo(
    () => selectedUserPermissionOverrides.filter((override) => (
      override.is_active && override.applies_to_role === resolvedActiveRole
    )),
    [resolvedActiveRole, selectedUserPermissionOverrides],
  );
  const currentRoleScopeOverrides = useMemo(
    () => selectedUserScopeGroupOverrides.filter((override) => (
      override.is_active && override.applies_to_role === resolvedActiveRole
    )),
    [resolvedActiveRole, selectedUserScopeGroupOverrides],
  );
  const canResetCurrentRoleOverrides = currentRolePermissionOverrides.length > 0 || currentRoleScopeOverrides.length > 0;

  useEffect(() => {
    if (!selectedUserDetail || !resolvedActiveRole) {
      return;
    }
    if (selectedUserDetail.roles.some((role) => role.code === resolvedActiveRole)) {
      return;
    }
    setSelectedUserId(null);
  }, [resolvedActiveRole, selectedUserDetail]);

  useEffect(() => {
    if (!initialRoleCode || !roleCodes.includes(initialRoleCode)) {
      return;
    }
    setActiveRole(initialRoleCode);
  }, [initialRoleCode, roleCodes]);

  useEffect(() => {
    if (initialRoleCode === 'STUDENT') {
      setSelectedUserId(null);
      return;
    }
    setSelectedUserId(initialSelectedUserId ?? null);
  }, [initialRoleCode, initialSelectedUserId]);

  const handleAssignRole = async (user: UserList) => {
    if (!canManageRoleMembers || !resolvedActiveRole) {
      return;
    }
    setMutatingUserId(user.id);
    try {
      await assignRoles.mutateAsync({
        id: user.id,
        roles: [resolvedActiveRole],
      });
    } catch (error) {
      showApiError(error);
    } finally {
      setMutatingUserId((current) => (current === user.id ? null : current));
    }
  };

  const handleRemoveRole = async (user: UserList) => {
    if (!canManageRoleMembers || !resolvedActiveRole) {
      return;
    }
    const nextRoles = getManagedRoleCodes(user.roles).filter((roleCode) => roleCode !== resolvedActiveRole);
    setMutatingUserId(user.id);
    try {
      await assignRoles.mutateAsync({
        id: user.id,
        roles: nextRoles,
      });
    } catch (error) {
      showApiError(error);
    } finally {
      setMutatingUserId((current) => (current === user.id ? null : current));
    }
  };
  const handleSelectRole = (roleCode: RoleCode) => {
    setActiveRole(roleCode);
    setSelectedUserId(null);
    setMemberSearch('');
  };
  const handleSelectMember = (roleCode: RoleCode, user: UserList) => {
    setActiveRole(roleCode);
    setMemberSearch('');
    setSelectedUserId((current) => (
      current === user.id && resolvedActiveRole === roleCode ? null : user.id
    ));
  };
  const handleUserRoleToggle = async (roleCode: RoleCode) => {
    if (!selectedUserDetail) {
      return;
    }
    const nextRoles = selectedBusinessRoleCode === roleCode ? [] : [roleCode];
    const currentRoleCodes = getManagedRoleCodes(selectedUserDetail.roles);
    if (
      nextRoles.length === currentRoleCodes.length
      && nextRoles.every((code) => currentRoleCodes.includes(code))
    ) {
      return;
    }

    try {
      await assignRoles.mutateAsync({
        id: selectedUserDetail.id,
        roles: nextRoles,
      });
    } catch (error) {
      showApiError(error);
    }
  };
  const handleResetCurrentRoleOverrides = async () => {
    if (!selectedUserId || isResettingOverrides || !canResetCurrentRoleOverrides) {
      setResetDialogOpen(false);
      return;
    }

    setIsResettingOverrides(true);
    try {
      await Promise.all([
        ...currentRolePermissionOverrides.map((override) => (
          revokeUserOverride.mutateAsync({ userId: selectedUserId, overrideId: override.id })
        )),
        ...currentRoleScopeOverrides.map((override) => (
          revokeUserScopeGroupOverride.mutateAsync({ userId: selectedUserId, overrideId: override.id })
        )),
      ]);
      await refreshUser();
      await Promise.all([
        refetchSelectedUserDetail(),
        refetchSelectedUserPermissionOverrides(),
        refetchSelectedUserScopeGroupOverrides(),
      ]);
      setResetDialogOpen(false);
    } catch (error) {
      showApiError(error);
    } finally {
      setIsResettingOverrides(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isLoadingTemplate ? (
        <div className="flex min-h-0 flex-1 items-center justify-center gap-2 rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-6 py-16 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载角色模板...
        </div>
      ) : resolvedActiveRole ? (
        <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[20px] border border-border/70 bg-white xl:grid-cols-[320px_minmax(0,1fr)]">
          <RoleTemplateMemberPanel
            roleCodes={roleCodes}
            activeRole={resolvedActiveRole}
            search={memberSearch}
            onSearchChange={setMemberSearch}
            membersByRole={groupedMembersByRole}
            candidateUsers={candidateUsers}
            isLoading={isLoadingMembers}
            canManageMembers={canManageRoleMembers}
            isMutating={assignRoles.isPending}
            mutatingUserId={mutatingUserId}
            onAddMember={(user) => void handleAssignRole(user)}
            onRemoveMember={(user) => void handleRemoveRole(user)}
            selectedMemberId={selectedUserId}
            canSelectMember={canManageRoleMembers}
            onSelectRole={handleSelectRole}
            onSelectMember={handleSelectMember}
          />
          <div ref={setWorkbenchElement} className="flex min-h-0 flex-col">
            {!isViewingUserOverrides ? (
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <>
                  <h3 className="text-sm font-semibold text-foreground">
                    {ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}
                  </h3>
                  {isSavingCurrentRole ? (
                    <span className="text-xs font-medium text-primary">保存中...</span>
                  ) : null}
                </>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto px-4 py-5">
              {isViewingUserOverrides ? (
                <UserPermissionWorkbench
                  userDetail={selectedUserDetail}
                  departments={departments}
                  selectedRoleCodes={selectedUserRoleCodes}
                  dialogContentElement={workbenchElement}
                  roleNameMap={roleNameMap}
                  canManageRoles={canManageRoleMembers}
                  isRoleBusy={assignRoles.isPending}
                  onToggleRole={(roleCode) => { void handleUserRoleToggle(roleCode); }}
                  isLoading={isLoadingSelectedUser}
                  emptyDescription="请选择一个角色成员开始配置权限。"
                  metaSuffix={ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole ?? ''}
                  headerClassName="border-b-0 px-0 py-0 pb-4"
                  contentClassName="px-0 pt-0 pb-0"
                  headerActions={(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canResetCurrentRoleOverrides || isResettingOverrides}
                      onClick={() => setResetDialogOpen(true)}
                      className="h-8 px-3 text-[12px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      重置为模板
                    </Button>
                  )}
                />
              ) : (
                <PermissionModuleSections
                  sections={permissionSections}
                  renderPermissionCard={(permission) => {
                    const checked = selectedRolePermissionCodeSet.has(permission.code);
                    const disabled = !canUpdateRoleTemplate || isSavingCurrentRole;

                    return (
                      <PermissionToggleCard
                        key={permission.code}
                        permission={permission}
                        checked={checked}
                        disabled={disabled}
                        isSaving={isSavingCurrentRole}
                        onToggle={(nextChecked) => {
                          const nextCodes = applyPermissionSelectionChange({
                            currentEnabledCodes: selectedRolePermissionCodes,
                            nextChecked,
                            permissionCatalog,
                            permissionCode: permission.code,
                          });
                          onChangeCodes(resolvedActiveRole, nextCodes);
                        }}
                      />
                    );
                  }}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}
      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="重置当前角色授权？"
        description={`将撤销该用户在“${ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}”角色下的全部例外权限与范围配置，并恢复为角色模板继承。`}
        confirmText="确认重置"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleResetCurrentRoleOverrides}
        isConfirming={isResettingOverrides}
      />
    </div>
  );
};
