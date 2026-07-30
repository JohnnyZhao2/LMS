import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { AUTH_ROLES } from '@/config/role-constants';
import {
  USER_PERMISSION_VIEW_PERMISSION,
  USER_ROLE_ASSIGN_PERMISSION,
} from '@/config/permission-constants';
import { isAllowedDepartmentCode, useUserDetail, useUsers } from '@/entities/user/api/get-users';
import { useAssignRoles } from '@/entities/user/api/manage-users';
import {
  getManagedRoleCodes,
  getNextAssignableRoleCodes,
  isAssignableRoleCode,
  withoutAuthRoles,
} from '@/entities/user/utils/user-role-assignment';
import { useAuth } from '@/session/auth/auth-context';
import type { RoleCode, UserList } from '@/types/common';
import { showApiError } from '@/utils/error-handler';
import { RoleMemberPanel } from '../components/role-member-panel';
import { UserPermissionPanel } from '../components/user-permission-panel';

/**
 * 用户授权中心：角色成员管理 + 用户权限配置。
 */
export const AuthorizationCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasCapability } = useAuth();
  const canManageRoleMembers = hasCapability(USER_ROLE_ASSIGN_PERMISSION);
  const canViewUserAuthorization = hasCapability(USER_PERMISSION_VIEW_PERMISSION);

  const initialRoleCode = searchParams.get('role_code');
  const initialUserIdParam = searchParams.get('user_id');
  const initialSelectedRole = AUTH_ROLES.includes(initialRoleCode as RoleCode)
    ? (initialRoleCode as RoleCode)
    : null;
  const initialSelectedUserId = initialUserIdParam ? Number(initialUserIdParam) : null;

  const [activeRole, setActiveRole] = useState<RoleCode | null>(initialSelectedRole);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialSelectedUserId);
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const assignRoles = useAssignRoles();

  const resolvedActiveRole = useMemo(
    () => (activeRole && AUTH_ROLES.includes(activeRole) ? activeRole : AUTH_ROLES[0] ?? null),
    [activeRole],
  );
  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    { isActive: true },
    { enabled: Boolean(resolvedActiveRole) && (canManageRoleMembers || canViewUserAuthorization) },
  );
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
  } = useUserDetail(selectedUserId ?? 0);

  const groupedMembersByRole = useMemo(() => {
    const keyword = deferredMemberSearch.trim().toLowerCase();
    const byUsername = (left: UserList, right: UserList) =>
      left.username.localeCompare(right.username, 'zh-Hans-CN');
    const matchesSearch = (user: UserList) => !keyword
      || user.username.toLowerCase().includes(keyword)
      || user.employee_id.toLowerCase().includes(keyword);

    return Object.fromEntries(
      AUTH_ROLES.map((roleCode) => [
        roleCode,
        allVisibleUsers
          .filter((user) => user.roles.some((role) => role.code === roleCode))
          .filter((user) => roleCode !== resolvedActiveRole || matchesSearch(user))
          .sort(byUsername),
      ]),
    ) as Partial<Record<RoleCode, UserList[]>>;
  }, [allVisibleUsers, deferredMemberSearch, resolvedActiveRole]);

  const candidatesByRole = useMemo(
    () => Object.fromEntries(
      AUTH_ROLES.map((roleCode) => [
        roleCode,
        allVisibleUsers
          .filter((user) => !user.is_superuser)
          .filter((user) => !user.roles.some((role) => role.code === roleCode))
          .filter((user) => user.roles.every((role) => role.code === 'STUDENT' || !isAssignableRoleCode(role.code)))
          .filter((user) => isAllowedDepartmentCode(user.department?.code))
          .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN')),
      ]),
    ) as Partial<Record<RoleCode, UserList[]>>,
    [allVisibleUsers],
  );

  const selectedUserRoleCodes = useMemo(
    () => selectedUserDetail?.roles.map((role) => role.code as RoleCode) ?? [],
    [selectedUserDetail],
  );

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
    if (!initialSelectedRole || !AUTH_ROLES.includes(initialSelectedRole)) {
      return;
    }
    setActiveRole(initialSelectedRole);
  }, [initialSelectedRole]);

  useEffect(() => {
    setSelectedUserId(initialSelectedUserId ?? null);
  }, [initialSelectedRole, initialSelectedUserId]);

  const handleAssignRole = async (roleCode: RoleCode, user: UserList) => {
    if (!canManageRoleMembers || !AUTH_ROLES.includes(roleCode)) {
      return;
    }
    setMutatingUserId(user.id);
    try {
      await assignRoles.mutateAsync({
        id: user.id,
        roles: getNextAssignableRoleCodes(getManagedRoleCodes(user.roles), roleCode),
      });
      setActiveRole(roleCode);
      setMemberSearch('');
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
    setMutatingUserId(user.id);
    try {
      await assignRoles.mutateAsync({
        id: user.id,
        roles: withoutAuthRoles(getManagedRoleCodes(user.roles)),
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

  return (
    <PageFillShell>
      <PageWorkbench className="gap-0">
        <div className="flex min-h-0 flex-1 flex-col">
          {resolvedActiveRole ? (
            <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[20px] border border-border/70 bg-white xl:grid-cols-[320px_minmax(0,1fr)]">
              <RoleMemberPanel
                roleCodes={AUTH_ROLES}
                activeRole={resolvedActiveRole}
                search={memberSearch}
                onSearchChange={setMemberSearch}
                membersByRole={groupedMembersByRole}
                candidatesByRole={candidatesByRole}
                isLoading={isLoadingMembers}
                canManageMembers={canManageRoleMembers}
                isMutating={assignRoles.isPending}
                mutatingUserId={mutatingUserId}
                onAddMember={(roleCode, user) => void handleAssignRole(roleCode, user)}
                onRemoveMember={(user) => void handleRemoveRole(user)}
                selectedMemberId={selectedUserId}
                canSelectMember={canViewUserAuthorization}
                onSelectRole={handleSelectRole}
                onSelectMember={handleSelectMember}
              />
              <div className="flex min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-auto px-4 py-5">
                  {selectedUserId ? (
                    <UserPermissionPanel
                      userDetail={selectedUserDetail}
                      selectedRoleCodes={selectedUserRoleCodes}
                      isLoading={isLoadingSelectedUser}
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
      </PageWorkbench>
    </PageFillShell>
  );
};
