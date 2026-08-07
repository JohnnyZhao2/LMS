import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode, UserList } from '@/types/common';
import { isAllowedDepartmentCode, useRoles, useUserDetail, useUsers } from '@/entities/user/api/get-users';
import { useAssignRoles } from '@/entities/user/api/manage-users';
import { useAuth } from '@/session/auth/auth-context';
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

export const MANAGEMENT_ROLE_CODES: RoleCode[] = ['MENTOR', 'DEPT_MANAGER', 'ADMIN'];
/** 用户授权中心仅管理角色；学员不参与授权配置 */
export const AUTHORIZATION_PANEL_ROLE_CODES: RoleCode[] = MANAGEMENT_ROLE_CODES;

interface UseAuthorizationCenterStateParams {
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

export function useAuthorizationCenterState({
  roleCodes,
  permissionCatalog,
  initialRoleCode = null,
  initialSelectedUserId = null,
}: UseAuthorizationCenterStateParams) {
  const { hasCapability } = useAuth();
  const canManageRoleMembers = hasCapability(USER_ROLE_ASSIGN_PERMISSION);
  const canViewUserAuthorization = USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const [activeRole, setActiveRole] = useState<RoleCode | null>(
    initialRoleCode && MANAGEMENT_ROLE_CODES.includes(initialRoleCode) ? initialRoleCode : null,
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialRoleCode && MANAGEMENT_ROLE_CODES.includes(initialRoleCode) ? initialSelectedUserId : null,
  );
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const assignRoles = useAssignRoles();

  const resolvedActiveRole = useMemo(
    () => (activeRole && roleCodes.includes(activeRole) ? activeRole : roleCodes[0] ?? null),
    [activeRole, roleCodes],
  );
  const canEditPermissions = Boolean(selectedUserId && resolvedActiveRole);

  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    {},
    { enabled: Boolean(resolvedActiveRole) && (canManageRoleMembers || canViewUserAuthorization) },
  );
  const { data: roles = [] } = useRoles();
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
  } = useUserDetail(selectedUserId ?? 0);

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
    () => (resolvedActiveRole ? {
      ...membersByRole,
      [resolvedActiveRole]: roleMembers,
    } : membersByRole),
    [membersByRole, resolvedActiveRole, roleMembers],
  );
  const candidateUsers = useMemo(
    () => {
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
        .filter((user) => user.roles.every((role) => !isAssignableRoleCode(role.code)))
        .filter((user) => isAllowedDepartmentCode(user.department?.code))
        .filter((user) => {
          if (resolvedActiveRole === 'DEPT_MANAGER') {
            return Boolean(user.department?.id) && !occupiedDeptManagerDepartmentIds.has(user.department.id);
          }
          return true;
        })
        .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN'));
    },
    [allVisibleUsers, resolvedActiveRole],
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
    if (!initialRoleCode || !roleCodes.includes(initialRoleCode)) {
      return;
    }
    setActiveRole(initialRoleCode);
  }, [initialRoleCode, roleCodes]);

  useEffect(() => {
    if (!initialRoleCode || !MANAGEMENT_ROLE_CODES.includes(initialRoleCode)) {
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
    const currentRoleCodes = getManagedRoleCodes(selectedUserDetail.roles);
    const nextRoles = getNextAssignableRoleCodes(currentRoleCodes, roleCode);
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
      if (nextRoles.length > 0) {
        setActiveRole(roleCode);
        setSelectedUserId(selectedUserDetail.id);
      } else {
        setSelectedUserId(null);
      }
    } catch (error) {
      showApiError(error);
    }
  };

  return {
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
    isAssigningRoles: assignRoles.isPending,
    isLoadingMembers,
    isLoadingSelectedUser,
    memberSearch,
    mutatingUserId,
    permissionCatalog,
    resolvedActiveRole,
    roleNameMap,
    selectedUserDetail,
    selectedUserId,
    setMemberSearch,
  };
}
