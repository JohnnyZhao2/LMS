import { Loader2, RotateCcw } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserPermissionWorkbench } from '@/entities/authorization/components/user-permission-workbench';
import { applyPermissionSelectionChange } from '@/entities/authorization/utils/permission-dependencies';
import { PermissionModuleSections } from '@/entities/authorization/components/permission-module-sections';
import { PermissionToggleCard } from '@/entities/authorization/components/permission-toggle-card';
import { RoleTemplateMemberPanel } from './role-template-member-panel';
import { useRolePermissionTemplateState } from './use-role-permission-template-state';

interface RolePermissionTemplatePanelProps {
  canViewRoleTemplate: boolean;
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
  canViewRoleTemplate,
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
  const {
    canManageRoleMembers,
    canViewUserAuthorization,
    candidateUsers,
    canResetCurrentRoleOverrides,
    departments,
    groupedMembersByRole,
    handleAssignRole,
    handleRemoveRole,
    handleResetCurrentRoleOverrides,
    handleSelectMember,
    handleSelectRole,
    handleUserRoleToggle,
    isAssigningRoles,
    isLoadingMembers,
    isLoadingSelectedUser,
    isResettingOverrides,
    isSavingCurrentRole,
    isViewingUserOverrides,
    memberSearch,
    mutatingUserId,
    permissionSections,
    resetDialogOpen,
    resolvedActiveRole,
    roleNameMap,
    selectedRolePermissionCodes,
    selectedRolePermissionCodeSet,
    selectedUserDetail,
    selectedUserId,
    selectedUserRoleCodes,
    setMemberSearch,
    setResetDialogOpen,
    setWorkbenchElement,
    workbenchElement,
  } = useRolePermissionTemplateState({
    roleCodes,
    permissionCatalog,
    permissionCodesByRole,
    savingRoleCodes,
    initialRoleCode,
    initialSelectedUserId,
  });

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
            isMutating={isAssigningRoles}
            mutatingUserId={mutatingUserId}
            onAddMember={(user) => void handleAssignRole(user)}
            onRemoveMember={(user) => void handleRemoveRole(user)}
            selectedMemberId={selectedUserId}
            canSelectMember={canViewUserAuthorization}
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
                  selectedRoleCode={resolvedActiveRole}
                  dialogContentElement={workbenchElement}
                  roleNameMap={roleNameMap}
                  canManageRoles={canManageRoleMembers}
                  isRoleBusy={isAssigningRoles}
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
              ) : canViewRoleTemplate ? (
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
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 text-sm text-text-muted">
                  请选择左侧成员查看用户授权。
                </div>
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
