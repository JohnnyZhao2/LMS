import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { RoleCode, UserList } from '@/types/common';
import { isAllowedDepartmentCode, useUserDetail, useUsers } from '@/entities/user/api/get-users';
import { useAssignRoles } from '@/entities/user/api/manage-users';
import { useAuth } from '@/session/auth/auth-context';
import {
  useRevokeUserPermissionOverride,
  useUserPermissionOverrides,
} from '@/entities/authorization/api/authorization';
import { showApiError } from '@/utils/error-handler';
import {
  getNextAssignableRoleCodes,
  getManagedRoleCodes,
  isAssignableRoleCode,
} from '@/entities/authorization/utils/user-role-assignment';
import {
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_ROLE_ASSIGN_PERMISSION,
} from '@/entities/authorization/constants/access';

interface UseAuthorizationWorkbenchStateParams {
  roleCodes: RoleCode[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

/**
 * 授权工作台状态：角色成员管理 + 用户例外权限。
 */
export function useAuthorizationWorkbenchState({
  roleCodes,
  initialRoleCode = null,
  initialSelectedUserId = null,
}: UseAuthorizationWorkbenchStateParams) {
  const { hasCapability, refreshUser } = useAuth();
  const canManageRoleMembers = hasCapability(USER_ROLE_ASSIGN_PERMISSION);
  const canViewUserAuthorization = USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const [activeRole, setActiveRole] = useState<RoleCode | null>(initialRoleCode);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialSelectedUserId,
  );
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResettingOverrides, setIsResettingOverrides] = useState(false);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const assignRoles = useAssignRoles();
  const revokeUserOverride = useRevokeUserPermissionOverride();

  const resolvedActiveRole = useMemo(
    () => (activeRole && roleCodes.includes(activeRole) ? activeRole : roleCodes[0] ?? null),
    [activeRole, roleCodes],
  );
  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    { isActive: true },
    { enabled: Boolean(resolvedActiveRole) && (canManageRoleMembers || canViewUserAuthorization) },
  );
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
    refetch: refetchSelectedUserDetail,
  } = useUserDetail(selectedUserId ?? 0);
  const {
    data: selectedUserPermissionOverrides = [],
    refetch: refetchSelectedUserPermissionOverrides,
  } = useUserPermissionOverrides(selectedUserId, Boolean(selectedUserId));

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
    () => (resolvedActiveRole ? {
      ...membersByRole,
      [resolvedActiveRole]: roleMembers,
    } : membersByRole),
    [membersByRole, resolvedActiveRole, roleMembers],
  );
  const candidateUsers = useMemo(
    () => allVisibleUsers
      .filter((user) => !user.is_superuser)
      .filter((user) => !user.roles.some((role) => role.code === resolvedActiveRole))
      .filter((user) => user.roles.every((role) => role.code === 'STUDENT' || !isAssignableRoleCode(role.code)))
      .filter((user) => isAllowedDepartmentCode(user.department?.code))
      .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN')),
    [allVisibleUsers, resolvedActiveRole],
  );

  const selectedUserRoleCodes = useMemo(
    () => selectedUserDetail?.roles.map((role) => role.code as RoleCode) ?? [],
    [selectedUserDetail],
  );
  const currentRolePermissionOverrides = useMemo(
    () => selectedUserPermissionOverrides.filter((override) => (
      override.applies_to_role === resolvedActiveRole
    )),
    [resolvedActiveRole, selectedUserPermissionOverrides],
  );
  const canResetCurrentRoleOverrides = currentRolePermissionOverrides.length > 0;

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
        roles: getNextAssignableRoleCodes(getManagedRoleCodes(user.roles), resolvedActiveRole),
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
    // 从授权角色组移除：清掉全部授权角色，仅保留学员身份（顺带修复脏的多授权角色数据）
    const nextRoles = getManagedRoleCodes(user.roles).filter((roleCode) => roleCode === 'STUDENT');
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

  const handleResetCurrentRoleOverrides = async () => {
    if (!selectedUserId || isResettingOverrides || !canResetCurrentRoleOverrides) {
      setResetDialogOpen(false);
      return;
    }

    setIsResettingOverrides(true);
    try {
      await Promise.all(
        currentRolePermissionOverrides.map((override) => (
          revokeUserOverride.mutateAsync({ userId: selectedUserId, overrideId: override.id })
        )),
      );
      await refreshUser();
      await Promise.all([
        refetchSelectedUserDetail(),
        refetchSelectedUserPermissionOverrides(),
      ]);
      setResetDialogOpen(false);
    } catch (error) {
      showApiError(error);
    } finally {
      setIsResettingOverrides(false);
    }
  };

  return {
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
    isAssigningRoles: assignRoles.isPending,
    isLoadingMembers,
    isLoadingSelectedUser,
    isResettingOverrides,
    isViewingUserOverrides: Boolean(selectedUserId),
    memberSearch,
    mutatingUserId,
    resetDialogOpen,
    resolvedActiveRole,
    selectedUserDetail,
    selectedUserId,
    selectedUserRoleCodes,
    setMemberSearch,
    setResetDialogOpen,
  };
}
