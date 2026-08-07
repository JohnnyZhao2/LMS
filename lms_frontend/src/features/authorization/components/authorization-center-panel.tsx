import { ROLE_FULL_LABELS } from '@/config/role-constants';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { UserPermissionSection } from '@/entities/authorization/components/user-permission-section';
import { UserPermissionWorkbench } from '@/entities/authorization/components/user-permission-workbench';
import { RoleTemplateMemberPanel } from './role-template-member-panel';
import { useAuthorizationCenterState } from './use-authorization-center-state';

interface AuthorizationCenterPanelProps {
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  canViewUserPermissions: boolean;
  canUpdateUserPermissions: boolean;
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

const FIXED_SCOPE_NOTICE = '数据范围固定：导师管理名下学员及本人创建内容，室经理管理本室学员及本人创建内容，管理员管理全局。';

export const AuthorizationCenterPanel: React.FC<AuthorizationCenterPanelProps> = ({
  roleCodes,
  permissionCatalog,
  canViewUserPermissions,
  canUpdateUserPermissions,
  initialRoleCode = null,
  initialSelectedUserId = null,
}) => {
  const {
    canEditPermissions,
    canManageRoleMembers,
    canViewUserAuthorization,
    candidateUsers,
    groupedMembersByRole,
    handleAssignRole,
    handleRemoveRole,
    handleSelectMember,
    handleSelectRole,
    handleUserRoleToggle,
    isAssigningRoles,
    isLoadingMembers,
    isLoadingSelectedUser,
    memberSearch,
    mutatingUserId,
    resolvedActiveRole,
    roleNameMap,
    selectedUserDetail,
    selectedUserId,
    setMemberSearch,
  } = useAuthorizationCenterState({
    roleCodes,
    permissionCatalog,
    initialRoleCode,
    initialSelectedUserId,
  });

  if (!resolvedActiveRole) {
    return null;
  }

  return (
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
        isMutating={isAssigningRoles}
        mutatingUserId={mutatingUserId}
        onAddMember={(user) => void handleAssignRole(user)}
        onRemoveMember={(user) => void handleRemoveRole(user)}
        selectedMemberId={selectedUserId}
        canSelectMember={canViewUserAuthorization}
        onSelectRole={handleSelectRole}
        onSelectMember={handleSelectMember}
      />
      <div className="flex min-h-0 flex-col">
        {!selectedUserId && canViewUserPermissions ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}默认权限
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {FIXED_SCOPE_NOTICE} 修改后应用于该角色全部成员。
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-5">
              <UserPermissionSection
                key={resolvedActiveRole}
                roleCode={resolvedActiveRole}
                permissionCatalog={permissionCatalog}
                canUpdate={canUpdateUserPermissions}
              />
            </div>
          </div>
        ) : canEditPermissions && canViewUserPermissions ? (
          <UserPermissionWorkbench
            userDetail={selectedUserDetail}
            permissionCatalog={permissionCatalog}
            canUpdatePermissions={canUpdateUserPermissions}
            roleNameMap={roleNameMap}
            canManageRoles={canManageRoleMembers}
            isRoleBusy={isAssigningRoles}
            onToggleRole={(roleCode) => { void handleUserRoleToggle(roleCode); }}
            isLoading={isLoadingSelectedUser}
            emptyDescription="请选择一个角色成员开始配置权限。"
            metaSuffix={ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}
            headerClassName="border-b-0 px-4 py-3"
            contentClassName="px-4 pt-2 pb-5"
            scopeNotice={FIXED_SCOPE_NOTICE}
          />
        ) : (
          <div className="flex h-full min-h-[260px] items-center justify-center px-6 text-sm text-text-muted">
            {canViewUserPermissions
              ? '请从左侧选择一个成员查看并配置权限。'
              : '当前账号没有用户权限查看权限。'}
          </div>
        )}
      </div>
    </section>
  );
};
