import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/common/user-avatar';
import { isAllowedDepartmentCode, useDepartments, useRoles, useUserDetail, useUsers } from '@/features/users/api/get-users';
import { useAssignRoles } from '@/features/users/api/manage-users';
import { useAuth } from '@/features/auth/stores/auth-context';
import {
  useRevokeUserPermissionOverride,
  useRevokeUserScopeGroupOverride,
  useUserPermissionOverrides,
  useUserScopeGroupOverrides,
} from '@/features/authorization/api/authorization';
import { UserPermissionModuleSidebar } from '@/features/users/components/user-permission-module-sidebar';
import { UserPermissionSection } from '@/features/users/components/user-permission-section';
import { ASSIGNABLE_ROLES, getRoleColor } from '@/lib/role-config';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';
import { getModulePresentation } from '../constants/permission-presentation';
import { applyPermissionSelectionChange } from '../utils/permission-dependencies';
import { PermissionModuleSections } from './permission-module-sections';
import { PermissionToggleCard } from './permission-toggle-card';
import { RoleTemplateMemberPanel } from './role-template-member-panel';
import type { UserList } from '@/types/common';

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

  const permissionGroups = useMemo(() => {
    const groups: Record<string, PermissionCatalogItem[]> = {};
    permissionCatalog.forEach((permission) => {
      if (!groups[permission.module]) {
        groups[permission.module] = [];
      }
      groups[permission.module].push(permission);
    });
    return Object.entries(groups)
      .map(([module, permissions]) => ({
        module,
        permissions,
        modulePresentation: getModulePresentation(module),
      }))
      .sort((a, b) => {
        if (a.modulePresentation.order !== b.modulePresentation.order) {
          return a.modulePresentation.order - b.modulePresentation.order;
        }
        return a.modulePresentation.label.localeCompare(b.modulePresentation.label, 'zh-Hans-CN');
      });
  }, [permissionCatalog]);

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
    () => permissionGroups.map((group) => ({
      module: group.module,
      permissions: group.permissions,
    })),
    [permissionGroups],
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
  const getManagedRoleCodes = (user: UserList): RoleCode[] => user.roles
    .map((role) => role.code)
    .filter((roleCode): roleCode is RoleCode => ASSIGNABLE_ROLES.includes(roleCode as RoleCode));
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
      ASSIGNABLE_ROLES.map((roleCode) => [
        roleCode,
        allVisibleUsers
          .filter((user) => user.roles.some((role) => role.code === roleCode))
          .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN')),
      ]),
    ) as Partial<Record<RoleCode, UserList[]>>,
    [allVisibleUsers],
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
    () => selectedUserDetail?.roles
      .filter((role) => role.code !== 'STUDENT' && role.code !== 'SUPER_ADMIN')
      .map((role) => role.code as RoleCode)[0] ?? null,
    [selectedUserDetail],
  );
  const hasStudentRole = useMemo(
    () => selectedUserDetail?.roles.some((role) => role.code === 'STUDENT') ?? false,
    [selectedUserDetail],
  );
  const currentAssignedRoleTags = useMemo(
    () => {
      const tags: Array<{ code: RoleCode; name: string }> = [];
      if (hasStudentRole) {
        tags.push({
          code: 'STUDENT',
          name: roleNameMap.get('STUDENT') ?? '学员',
        });
      }
      if (selectedBusinessRoleCode) {
        tags.push({
          code: selectedBusinessRoleCode,
          name: roleNameMap.get(selectedBusinessRoleCode) ?? selectedBusinessRoleCode,
        });
      }
      return tags;
    },
    [hasStudentRole, roleNameMap, selectedBusinessRoleCode],
  );
  const remainingAssignableRoles = useMemo(
    () => ASSIGNABLE_ROLES.filter((roleCode) => roleCode !== selectedBusinessRoleCode),
    [selectedBusinessRoleCode],
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
    const nextRoles = getManagedRoleCodes(user).filter((roleCode) => roleCode !== resolvedActiveRole);
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
  const handleSelectMember = (user: UserList) => {
    setSelectedUserId((current) => (current === user.id ? null : user.id));
  };
  const handleUserRoleToggle = async (roleCode: RoleCode) => {
    if (!selectedUserDetail) {
      return;
    }
    const nextRoles = selectedBusinessRoleCode === roleCode ? [] : [roleCode];
    const currentRoleCodes = selectedUserDetail.roles
      .filter((role) => role.code !== 'STUDENT' && role.code !== 'SUPER_ADMIN')
      .map((role) => role.code as RoleCode);
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
        <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[20px] border border-border/70 bg-white xl:grid-cols-[220px_minmax(0,1fr)_305px]">
          <aside className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,0.96))] px-3 py-4 xl:border-b-0 xl:border-r">
            <div className="mb-3 px-1">
              <h3 className="text-sm font-semibold text-foreground">角色模板</h3>
              <p className="mt-1 text-[11px] leading-5 text-text-muted">选择角色后直接编辑默认权限。</p>
            </div>
            <UserPermissionModuleSidebar
              permissionModules={roleCodes}
              activePermissionModule={resolvedActiveRole}
              onSelectModule={(moduleName) => {
                setActiveRole(moduleName as RoleCode);
                setSelectedUserId(null);
              }}
              getModuleLabel={(moduleName) => ROLE_FULL_LABELS[moduleName as RoleCode] ?? moduleName}
              showCounts={false}
            />
          </aside>

          <div ref={setWorkbenchElement} className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              {isViewingUserOverrides ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      avatarKey={selectedUserDetail?.avatar_key}
                      name={selectedUserDetail?.username ?? ''}
                      size="md"
                      className="h-9 w-9 shrink-0"
                    />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {selectedUserDetail?.username ?? ''}
                      </h3>
                      <p className="truncate text-xs text-text-muted">
                        {selectedUserDetail?.employee_id || '未填写工号'}
                        {selectedUserDetail?.department?.name ? ` · ${selectedUserDetail.department.name}` : ''}
                        {' · '}
                        {ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    {currentAssignedRoleTags.map((role) => {
                      const color = getRoleColor(role.code);
                      const canClearRole = role.code === selectedBusinessRoleCode;
                      if (canClearRole) {
                        return (
                          <button
                            key={role.code}
                            type="button"
                            disabled={!canManageRoleMembers || assignRoles.isPending}
                            onClick={() => { void handleUserRoleToggle(role.code); }}
                            aria-label={`取消${role.name}角色`}
                            className={cn(
                              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                              color.bgClass,
                              color.mutedTextClass,
                              canManageRoleMembers && !assignRoles.isPending
                                ? 'cursor-pointer hover:brightness-95'
                                : 'cursor-not-allowed opacity-55',
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', color.iconBgClass ?? 'bg-current')} />
                            {role.name}
                            <X className="h-3 w-3 opacity-70" />
                          </button>
                        );
                      }
                      return (
                        <span
                          key={role.code}
                          className={cn(
                            'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                            color.bgClass,
                            color.mutedTextClass,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', color.iconBgClass ?? 'bg-current')} />
                          {role.name}
                        </span>
                      );
                    })}
                    {currentAssignedRoleTags.length > 0 && remainingAssignableRoles.length > 0 ? (
                      <span className="mx-1 h-4 w-px bg-border/80" />
                    ) : null}
                    {remainingAssignableRoles.map((roleCode) => {
                      const active = selectedBusinessRoleCode === roleCode;
                      const color = getRoleColor(roleCode);
                      const roleName = roleNameMap.get(roleCode) ?? roleCode;
                      const mutuallyExclusive = selectedBusinessRoleCode !== null && !active;
                      return (
                        <button
                          key={roleCode}
                          type="button"
                          disabled={!canManageRoleMembers || assignRoles.isPending}
                          onClick={() => { void handleUserRoleToggle(roleCode); }}
                          className={cn(
                            'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                            active
                              ? `${color.bgClass} ${color.mutedTextClass}`
                              : mutuallyExclusive
                                ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                : 'bg-white text-text-muted hover:bg-muted/35',
                            (!canManageRoleMembers || assignRoles.isPending) && 'cursor-not-allowed opacity-55',
                          )}
                        >
                          {active ? (
                            <span className={cn('h-1.5 w-1.5 rounded-full', color.iconBgClass ?? 'bg-current')} />
                          ) : null}
                          {roleName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-foreground">
                    {ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}
                  </h3>
                  {isSavingCurrentRole ? (
                    <span className="text-xs font-medium text-primary">保存中...</span>
                  ) : null}
                </>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-5">
              {isViewingUserOverrides ? (
                isLoadingSelectedUser ? (
                  <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在加载用户授权...
                  </div>
                ) : selectedUserDetail ? (
                  <UserPermissionSection
                    key={selectedUserDetail.id}
                    userId={selectedUserDetail.id}
                    userDetail={selectedUserDetail}
                    departments={departments}
                    selectedRoleCodes={selectedUserRoleCodes}
                    departmentId={selectedUserDetail.department?.id}
                    isSuperuserAccount={Boolean(selectedUserDetail.is_superuser)}
                    dialogContentElement={workbenchElement}
                  />
                ) : null
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

          {resolvedActiveRole === 'STUDENT' ? (
            <aside className="flex min-h-0 flex-col border-t border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,0.96))] xl:border-t-0 xl:border-l">
              <div className="border-b border-border/60 px-3.5 py-4">
                <h3 className="text-sm font-semibold text-foreground">角色成员</h3>
                <p className="mt-1 text-[11px] leading-5 text-text-muted">
                  学员角色固定按模板继承，不支持单独配置成员。
                </p>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-8 text-center">
                <p className="text-[12px] leading-6 text-text-muted">
                  当前为学员模板，右侧成员管理已关闭。
                </p>
              </div>
            </aside>
          ) : (
            <RoleTemplateMemberPanel
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
              onSelectMember={handleSelectMember}
            />
          )}
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
