import { useMemo, useState, type ReactNode } from 'react';
import { KeyRound, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { useAuthorizationRoles, useUpdateRole } from '@/features/authorization/api/authorization';
import { RolePermissionSection } from '@/features/authorization/components/role-permission-section';
import {
  isAllowedDepartmentCode,
  useDepartments,
  useUsers,
} from '@/api/users/get-users';
import { useAssignRoles } from '@/api/users/manage-users';
import { USER_ROLE_ASSIGN_PERMISSION } from '@/config/authorization';
import { useAuth } from '@/lib/auth';
import {
  composeRoleCodes,
  getPrimaryIdentity,
  getSpecialtyRoleCodes,
  isBuiltinPrimaryRole,
} from '@/lib/user-role-assignment';
import { showApiError } from '@/utils/error-handler';
import type { PermissionCatalogItem, UpdateRolePayload } from '@/features/authorization/types';
import type { RoleCode, UserList } from '@/types/common';
import { CreateRoleDialog } from './create-role-dialog';
import { RoleConfigHeader } from './role-config-header';
import { RoleListItem } from './role-list-item';
import { RoleMemberPanel } from './role-member-panel';

interface AuthorizationCenterPanelProps {
  permissionCatalog: PermissionCatalogItem[];
  initialRoleCode?: RoleCode | null;
}

const sortByUsername = (left: UserList, right: UserList) =>
  left.username.localeCompare(right.username, 'zh-Hans-CN');

export const AuthorizationCenterPanel: React.FC<AuthorizationCenterPanelProps> = ({
  permissionCatalog,
  initialRoleCode = null,
}) => {
  const { hasCapability, user } = useAuth();
  const isSuperAdmin = Boolean(user?.is_superuser);
  const canManageRoleMembers = isSuperAdmin || hasCapability(USER_ROLE_ASSIGN_PERMISSION);

  const [selectedRoleCode, setSelectedRoleCode] = useState<RoleCode | null>(initialRoleCode);
  const [createOpen, setCreateOpen] = useState(false);

  const assignRoles = useAssignRoles();
  const updateRole = useUpdateRole();
  const { data: roles = [], isLoading: isLoadingRoles } = useAuthorizationRoles(canManageRoleMembers);
  const { data: departments = [] } = useDepartments();
  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    {},
    { enabled: canManageRoleMembers },
  );

  const effectiveActiveRoleCode = useMemo(() => {
    if (roles.length === 0) return selectedRoleCode ?? initialRoleCode ?? null;
    if (selectedRoleCode && roles.some((r) => r.code === selectedRoleCode)) return selectedRoleCode;
    if (initialRoleCode && roles.some((r) => r.code === initialRoleCode)) return initialRoleCode;
    return roles[0].code;
  }, [initialRoleCode, roles, selectedRoleCode]);

  const activeRoleItem = useMemo(
    () => roles.find((role) => role.code === effectiveActiveRoleCode) ?? null,
    [effectiveActiveRoleCode, roles],
  );

  const membersByRole = useMemo(() => {
    return Object.fromEntries(
      roles.map((role) => {
        const members = allVisibleUsers
          .filter((u) => u.roles.some((r) => r.code === role.code))
          .sort(sortByUsername);
        return [role.code, members];
      }),
    ) as Partial<Record<RoleCode, UserList[]>>;
  }, [allVisibleUsers, roles]);

  const activeRoleMembers = useMemo(
    () => (activeRoleItem ? (membersByRole[activeRoleItem.code] ?? []) : []),
    [activeRoleItem, membersByRole],
  );

  const candidateUsers = useMemo(() => {
    if (!activeRoleItem || !activeRoleItem.is_active) return [];
    const occupiedDeptManagerIds = new Set(
      departments
        .filter((d) => Boolean(d.manager_id))
        .map((d) => d.id),
    );
    const isBuiltinTarget = isBuiltinPrimaryRole(activeRoleItem.code);

    return allVisibleUsers
      .filter((u) => {
        if (
          u.is_superuser
          || !u.is_active
          || (!isSuperAdmin && u.id === user?.id)
          || !isAllowedDepartmentCode(u.department?.code)
        ) {
          return false;
        }
        const codes = u.roles.map((r) => r.code);
        if (codes.includes(activeRoleItem.code)) return false;
        if (isBuiltinTarget) {
          if (codes.some(isBuiltinPrimaryRole)) return false;
          return activeRoleItem.code !== 'DEPT_MANAGER'
            || (Boolean(u.department?.id) && !occupiedDeptManagerIds.has(u.department.id));
        }
        // 自定义专项角色可赋给普通学员，也可叠加到导师/室经理，但不叠到管理员
        return !codes.includes('ADMIN');
      })
      .sort(sortByUsername);
  }, [activeRoleItem, allVisibleUsers, departments, isSuperAdmin, user?.id]);

  const handleUpdateRole = async (payload: UpdateRolePayload): Promise<boolean> => {
    try {
      await updateRole.mutateAsync(payload);
      return true;
    } catch (error) {
      showApiError(error);
      return false;
    }
  };

  const mutateRoles = async (targetUser: UserList, nextRoles: RoleCode[]) => {
    if (!canManageRoleMembers) return;
    try {
      await assignRoles.mutateAsync({ id: targetUser.id, roles: nextRoles });
    } catch (error) {
      showApiError(error);
    }
  };

  const handleAddMember = (targetUser: UserList) => {
    if (!activeRoleItem) return;
    const existing = targetUser.roles.map((r) => r.code);
    const nextRoles = isBuiltinPrimaryRole(activeRoleItem.code)
      ? composeRoleCodes(activeRoleItem.code, getSpecialtyRoleCodes(existing))
      : composeRoleCodes(getPrimaryIdentity(existing), [...getSpecialtyRoleCodes(existing), activeRoleItem.code]);
    void mutateRoles(targetUser, nextRoles);
  };

  let rightPane: ReactNode;
  if (isLoadingRoles && !activeRoleItem) {
    rightPane = (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-text-muted">
        正在加载角色...
      </div>
    );
  } else if (!activeRoleItem) {
    rightPane = (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-8">
        <EmptyState
          icon={KeyRound}
          title="暂无角色"
          description={isSuperAdmin ? '请先新建角色。' : '暂无可管理的角色。'}
        />
      </div>
    );
  } else {
    rightPane = (
      <div className="flex min-h-0 flex-1 flex-col">
        {isSuperAdmin ? (
          <RoleConfigHeader
            role={activeRoleItem}
            departments={departments}
            isUpdatingRole={updateRole.isPending}
            onUpdateRole={handleUpdateRole}
          />
        ) : (
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-5">
            <h2 className="truncate text-base font-semibold tracking-[-0.01em] text-foreground">
              {activeRoleItem.name}
            </h2>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
          <RoleMemberPanel
            key={`members-${activeRoleItem.code}`}
            roleName={activeRoleItem.name}
            roleCode={activeRoleItem.code}
            roleActive={activeRoleItem.is_active}
            members={activeRoleMembers}
            candidateUsers={candidateUsers}
            isLoading={isLoadingMembers}
            canManageMembers={canManageRoleMembers && (isSuperAdmin || activeRoleItem.code !== 'ADMIN')}
            isMutating={assignRoles.isPending}
            mutatingUserId={assignRoles.isPending ? assignRoles.variables?.id ?? null : null}
            onAddMember={handleAddMember}
            onRemoveMember={(targetUser) => {
              void mutateRoles(
                targetUser,
                targetUser.roles.map((r) => r.code).filter((code) => code !== activeRoleItem.code),
              );
            }}
          />

          {isSuperAdmin ? (
            <RolePermissionSection
              roleCode={activeRoleItem.code}
              permissionCodes={activeRoleItem.permission_codes}
              permissionCatalog={permissionCatalog}
              isUpdatingRole={updateRole.isPending}
              onUpdateRole={handleUpdateRole}
            />
          ) : (
            <p className="text-xs text-text-muted">
              角色基础权限与数据范围仅超管可配置。
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-xl border border-border/70 bg-white xl:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border/60 bg-slate-50/55 xl:border-b-0 xl:border-r">
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4">
            <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">角色</h3>
            {isSuperAdmin ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
                className="h-8 px-2.5 text-[12px]"
              >
                <Plus className="h-3.5 w-3.5" />
                新建
              </Button>
            ) : null}
          </div>

          <ScrollContainer className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2.5">
            {isLoadingRoles && roles.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载角色中...
              </div>
            ) : roles.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-muted">暂无角色</p>
            ) : (
              <div className="space-y-1">
                {roles.map((role) => (
                  <RoleListItem
                    key={role.code}
                    role={role}
                    count={(membersByRole[role.code] ?? []).length}
                    isActive={role.code === effectiveActiveRoleCode}
                    canManageRole={isSuperAdmin}
                    isUpdatingRole={updateRole.isPending}
                    onUpdateRole={handleUpdateRole}
                    onSelect={() => setSelectedRoleCode(role.code)}
                    onDeleted={(removedCode) => {
                      if (selectedRoleCode === removedCode) {
                        setSelectedRoleCode(null);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollContainer>
        </aside>

        <div className="flex min-h-0 flex-col">{rightPane}</div>
      </section>

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        onCreated={(roleCode) => setSelectedRoleCode(roleCode)}
      />
    </>
  );
};
