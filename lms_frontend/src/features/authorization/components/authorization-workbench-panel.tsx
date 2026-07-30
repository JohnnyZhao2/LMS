import { RotateCcw } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import type { RoleCode } from '@/types/common';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserPermissionWorkbench } from '@/entities/authorization/components/user-permission-workbench';
import { RoleMemberPanel } from './role-member-panel';
import { useAuthorizationWorkbenchState } from './use-authorization-workbench-state';

interface AuthorizationWorkbenchPanelProps {
  roleCodes: RoleCode[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

/**
 * 授权工作台：按角色管理人选 + 配置用户例外权限。
 * 不含角色模版配置。
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
    canResetCurrentRoleOverrides,
    groupedMembersByRole,
    handleAssignRole,
    handleRemoveRole,
    handleResetCurrentRoleOverrides,
    handleSelectMember,
    handleSelectRole,
    isAssigningRoles,
    isLoadingMembers,
    isLoadingSelectedUser,
    isResettingOverrides,
    isViewingUserOverrides,
    memberSearch,
    mutatingUserId,
    resetDialogOpen,
    resolvedActiveRole,
    selectedUserDetail,
    selectedUserId,
    selectedUserRoleCodes,
    setMemberSearch,
    setResetDialogOpen,
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
              {isViewingUserOverrides ? (
                <UserPermissionWorkbench
                  userDetail={selectedUserDetail}
                  selectedRoleCodes={selectedUserRoleCodes}
                  selectedRoleCode={resolvedActiveRole}
                  isLoading={isLoadingSelectedUser}
                  emptyDescription="请选择一个角色成员开始配置权限。"
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
                      重置例外
                    </Button>
                  )}
                />
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 text-sm text-text-muted">
                  请选择左侧成员配置用户例外权限。
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="重置当前角色例外？"
        description={`将撤销该用户在“${ROLE_FULL_LABELS[resolvedActiveRole] ?? resolvedActiveRole}”角色下的全部例外权限。`}
        confirmText="确认重置"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleResetCurrentRoleOverrides}
        isConfirming={isResettingOverrides}
      />
    </div>
  );
};
