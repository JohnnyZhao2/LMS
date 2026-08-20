import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyRound } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import type { PermissionCatalogItem } from '@/features/authorization/types';
import type { RoleCode, UserList } from '@/types/common';
import { UserAvatar } from '@/components/users/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { UserPermissionSection } from '@/features/authorization/components/user-permission-section';
import { isAllowedDepartmentCode, useUserDetail, useUsers } from '@/api/users/get-users';
import { useAssignRoles } from '@/api/users/manage-users';
import { useAuth } from '@/lib/auth';
import { showApiError } from '@/utils/error-handler';
import {
  getManagedRoleCodes,
  isAssignableRoleCode,
} from '@/lib/user-role-assignment';
import {
  MANAGEMENT_ROLE_CODES,
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_PERMISSION_UPDATE_PERMISSION,
  USER_ROLE_ASSIGN_PERMISSION,
} from '@/config/authorization';
import { RoleMemberPanel } from './role-member-panel';

interface AuthorizationCenterPanelProps {
  permissionCatalog: PermissionCatalogItem[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

const PERMISSION_BUNDLE_NOTICE = '角色只决定能做什么。能对谁做由组织关系决定：名下学员、分管部门；管理员看全部。';

const sortByUsername = (left: UserList, right: UserList) =>
  left.username.localeCompare(right.username, 'zh-Hans-CN');

export const AuthorizationCenterPanel: React.FC<AuthorizationCenterPanelProps> = ({
  permissionCatalog,
  initialRoleCode = null,
  initialSelectedUserId = null,
}) => {
  const { hasCapability, user } = useAuth();
  const isSuperAdmin = Boolean(user?.is_superuser);
  const canUpdateUserPermissions = isSuperAdmin || hasCapability(USER_PERMISSION_UPDATE_PERMISSION);
  const canManageRoleBasePermissions = isSuperAdmin;
  const canManageRoleMembers = isSuperAdmin || hasCapability(USER_ROLE_ASSIGN_PERMISSION);
  const canViewUserPermissions = isSuperAdmin || USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const [activeRole, setActiveRole] = useState<RoleCode>(
    initialRoleCode && MANAGEMENT_ROLE_CODES.includes(initialRoleCode)
      ? initialRoleCode
      : MANAGEMENT_ROLE_CODES[0],
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialRoleCode && MANAGEMENT_ROLE_CODES.includes(initialRoleCode)
      ? initialSelectedUserId
      : null,
  );
  const assignRoles = useAssignRoles();

  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    {},
    { enabled: canManageRoleMembers || canViewUserPermissions },
  );
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
  } = useUserDetail(selectedUserId ?? 0);

  const groupedMembersByRole = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    return Object.fromEntries(
      MANAGEMENT_ROLE_CODES.map((roleCode) => {
        let members = allVisibleUsers.filter((user) => (
          user.roles.some((role) => role.code === roleCode)
        ));
        if (roleCode === activeRole && keyword) {
          members = members.filter((user) => (
            user.username.toLowerCase().includes(keyword)
            || user.employee_id.toLowerCase().includes(keyword)
          ));
        }
        return [roleCode, [...members].sort(sortByUsername)];
      }),
    ) as Partial<Record<RoleCode, UserList[]>>;
  }, [allVisibleUsers, memberSearch, activeRole]);

  const candidateUsers = useMemo(() => {
    const occupiedDeptManagerDepartmentIds = new Set(
      allVisibleUsers
        .filter((user) => (
          user.is_active
          && user.is_department_manager
          && isAllowedDepartmentCode(user.department?.code)
        ))
        .map((user) => user.department?.id)
        .filter((departmentId): departmentId is number => Boolean(departmentId)),
    );

    return allVisibleUsers
      .filter((user) => {
        if (
          user.is_superuser
          || user.roles.some((role) => isAssignableRoleCode(role.code))
          || !isAllowedDepartmentCode(user.department?.code)
        ) {
          return false;
        }
        if (activeRole === 'DEPT_MANAGER') {
          return Boolean(user.department?.id)
            && !occupiedDeptManagerDepartmentIds.has(user.department.id);
        }
        return true;
      })
      .sort(sortByUsername);
  }, [allVisibleUsers, activeRole]);

  useEffect(() => {
    if (
      selectedUserDetail
      && !selectedUserDetail.roles.some((role) => role.code === activeRole)
    ) {
      setSelectedUserId(null);
    }
  }, [activeRole, selectedUserDetail]);

  useEffect(() => {
    if (initialRoleCode && MANAGEMENT_ROLE_CODES.includes(initialRoleCode)) {
      setActiveRole(initialRoleCode);
      setSelectedUserId(initialSelectedUserId ?? null);
      return;
    }
    if (initialRoleCode) {
      setSelectedUserId(null);
    }
  }, [initialRoleCode, initialSelectedUserId]);

  const mutateRoles = async (user: UserList, roles: RoleCode[]) => {
    if (!canManageRoleMembers) {
      return;
    }
    try {
      await assignRoles.mutateAsync({ id: user.id, roles });
    } catch (error) {
      showApiError(error);
    }
  };

  const roleLabel = ROLE_FULL_LABELS[activeRole] ?? activeRole;
  const showUserEditor = Boolean(selectedUserId) && canViewUserPermissions;

  let rightPane: ReactNode;
  if (!selectedUserId && canManageRoleBasePermissions) {
    rightPane = (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {roleLabel}基础权限
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {PERMISSION_BUNDLE_NOTICE} 修改后立即作用于该角色全部成员（权限下限）。仅超管可配置。
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-5">
          <UserPermissionSection
            key={activeRole}
            roleCode={activeRole}
            permissionCatalog={permissionCatalog}
            canUpdate
          />
        </div>
      </div>
    );
  } else if (showUserEditor) {
    rightPane = (
      <Spinner spinning={isLoadingSelectedUser} className="min-h-0 flex-1">
        {!selectedUserDetail ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <EmptyState icon={KeyRound} description="请选择一个角色成员开始配置权限。" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  avatarKey={selectedUserDetail.avatar_key}
                  name={selectedUserDetail.username}
                  size="md"
                  className="h-9 w-9 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {selectedUserDetail.username}
                  </h2>
                  <p className="truncate text-xs text-text-muted">
                    {[
                      selectedUserDetail.employee_id || '未填写工号',
                      selectedUserDetail.department?.name,
                      roleLabel,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{PERMISSION_BUNDLE_NOTICE}</p>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-5">
              <UserPermissionSection
                key={selectedUserDetail.id}
                userId={selectedUserDetail.id}
                permissionCatalog={permissionCatalog}
                canUpdate={canUpdateUserPermissions}
              />
            </div>
          </div>
        )}
      </Spinner>
    );
  } else {
    rightPane = (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-8">
        <EmptyState
          icon={KeyRound}
          title={canViewUserPermissions ? `${roleLabel}基础权限` : undefined}
          description={
            canViewUserPermissions
              ? (canManageRoleBasePermissions
                ? '请从左侧选择一个成员查看并配置权限。'
                : '角色基础权限为系统级配置，仅超管可查看与修改。请选择左侧成员配置其额外权限。')
              : '当前账号没有用户权限查看权限。'
          }
        />
      </div>
    );
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-[20px] border border-border/70 bg-white xl:grid-cols-[320px_minmax(0,1fr)]">
      <RoleMemberPanel
        activeRole={activeRole}
        search={memberSearch}
        onSearchChange={setMemberSearch}
        membersByRole={groupedMembersByRole}
        candidateUsers={candidateUsers}
        isLoading={isLoadingMembers}
        canManageMembers={canManageRoleMembers}
        isMutating={assignRoles.isPending}
        mutatingUserId={assignRoles.isPending ? assignRoles.variables?.id ?? null : null}
        onAddMember={(user) => void mutateRoles(user, [activeRole])}
        onRemoveMember={(user) => {
          void mutateRoles(
            user,
            getManagedRoleCodes(user.roles).filter((roleCode) => roleCode !== activeRole),
          );
        }}
        selectedMemberId={selectedUserId}
        canSelectMember={canViewUserPermissions}
        onSelectRole={(roleCode) => {
          setActiveRole(roleCode);
          setSelectedUserId(null);
          setMemberSearch('');
        }}
        onSelectMember={(roleCode, user) => {
          setActiveRole(roleCode);
          setMemberSearch('');
          setSelectedUserId((current) => (
            current === user.id && activeRole === roleCode ? null : user.id
          ));
        }}
      />
      <div className="flex min-h-0 flex-col">{rightPane}</div>
    </section>
  );
};
