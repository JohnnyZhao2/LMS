import type { RoleCode } from '@/types/common';
import { UserPermissionWorkbench } from '@/entities/authorization/components/user-permission-workbench';
import { RoleMemberPanel } from './role-member-panel';
import { useAuthorizationWorkbenchState } from './use-authorization-workbench-state';

interface AuthorizationWorkbenchPanelProps {
  roleCodes: RoleCode[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

/**
 * 授权工作台：按角色管理人选 + 配置用户权限。
 */
export const AuthorizationWorkbenchPanel: React.FC<AuthorizationWorkbenchPanelProps> = ({
  roleCodes,
  initialRoleCode = null,
  initialSelectedUserId = null,
}) => {
  const {
    canManageRoleMembers,
    canViewUserAuthorization,
    candidateUsers,
    groupedMembersByRole,
    handleAssignRole,
    handleRemoveRole,
    handleSelectMember,
    handleSelectRole,
    isAssigningRoles,
    isLoadingMembers,
    isLoadingSelectedUser,
    isViewingUserPermissions,
    memberSearch,
    mutatingUserId,
    resolvedActiveRole,
    selectedUserDetail,
    selectedUserId,
    selectedUserRoleCodes,
    setMemberSearch,
  } = useAuthorizationWorkbenchState({
    roleCodes,
    initialRoleCode,
    initialSelectedUserId,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {resolvedActiveRole ? (
        <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[20px] border border-border/70 bg-white xl:grid-cols-[320px_minmax(0,1fr)]">
          <RoleMemberPanel
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
            <div className="min-h-0 flex-1 overflow-auto px-4 py-5">
              {isViewingUserPermissions ? (
                <UserPermissionWorkbench
                  userDetail={selectedUserDetail}
                  selectedRoleCodes={selectedUserRoleCodes}
                  selectedRoleCode={resolvedActiveRole}
                  isLoading={isLoadingSelectedUser}
                  emptyDescription="请选择一个角色成员开始配置权限。"
                  headerClassName="border-b-0 px-0 py-0 pb-4"
                  contentClassName="px-0 pt-0 pb-0"
                />
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 text-sm text-text-muted">
                  请选择左侧成员配置用户权限。
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
