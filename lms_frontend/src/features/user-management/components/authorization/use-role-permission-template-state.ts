import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode, UserList } from '@/types/common';
import { isAllowedDepartmentCode, useDepartments } from '@/features/user-management/api/users/get-departments';
import { useRoles } from '@/features/user-management/api/roles/get-roles';
import { useUserDetail } from '@/features/user-management/api/users/get-user-detail';
import { useUsers } from '@/features/user-management/api/users/get-users';
import { useUpdateUser } from '@/features/user-management/api/users/update-user';
import { useAuth } from '@/lib/auth-context';
import { useResetUserAuthorization } from '@/features/user-management/api/authorization/user-authorization';
import { showApiError } from '@/lib/api-error-handler';
import { buildPermissionModuleSections } from '@/features/user-management/utils/permission-sections';
import {
  getNextUserPermissionEditorRoleCode,
  getNextAssignableRoleCodes,
  getManagedRoleCodes,
  isAssignableRoleCode,
} from '@/utils/authorization/user-role-assignment';
import {
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_PERMISSION_UPDATE_PERMISSION,
  USER_ROLE_ASSIGN_PERMISSION,
} from '@/config/authorization-access';

interface UseRolePermissionTemplateStateParams {
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  permissionCodesByRole: Partial<Record<RoleCode, string[]>>;
  savingRoleCodes: RoleCode[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

/**
 * 角色权限模板面板状态：成员管理、用户授权查看与重置。
 */
export function useRolePermissionTemplateState({
  roleCodes,
  permissionCatalog,
  permissionCodesByRole,
  savingRoleCodes,
  initialRoleCode = null,
  initialSelectedUserId = null,
}: UseRolePermissionTemplateStateParams) {
  const { hasCapability, refreshUser } = useAuth();
  const canManageRoleMembers = hasCapability(USER_ROLE_ASSIGN_PERMISSION);
  const canViewUserAuthorization = USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const [activeRole, setActiveRole] = useState<RoleCode | null>(initialRoleCode);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialRoleCode && initialRoleCode !== 'STUDENT' ? initialSelectedUserId : null,
  );
  const [workbenchElement, setWorkbenchElement] = useState<HTMLDivElement | null>(null);
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const updateUser = useUpdateUser();
  const resetUserAuthorization = useResetUserAuthorization();

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
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );
  const isSavingCurrentRole = resolvedActiveRole ? savingRoleCodes.includes(resolvedActiveRole) : false;
  const { data: allVisibleUsers = [], isLoading: isLoadingMembers } = useUsers(
    {},
    { enabled: Boolean(resolvedActiveRole) && (canManageRoleMembers || canViewUserAuthorization) },
  );
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
    refetch: refetchSelectedUserDetail,
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
        .filter((user) => user.roles.every((role) => role.code === 'STUDENT' || !isAssignableRoleCode(role.code)))
        .filter((user) => isAllowedDepartmentCode(user.department?.code))
        .filter((user) => {
          if (resolvedActiveRole === 'TEAM_MANAGER') return !hasActiveTeamManager;
          if (resolvedActiveRole === 'DEPT_MANAGER') {
            return Boolean(user.department?.id) && !occupiedDeptManagerDepartmentIds.has(user.department.id);
          }
          return true;
        })
        .sort((left, right) => left.username.localeCompare(right.username, 'zh-Hans-CN'));
    },
    [allVisibleUsers, resolvedActiveRole],
  );

  const selectedUserRoleCodes = useMemo(
    () => selectedUserDetail?.roles.map((role) => role.code as RoleCode) ?? [],
    [selectedUserDetail],
  );
  /** 有用户授权更新权限、已选中用户且当前角色非 STUDENT 时可重置为角色模板 */
  const canResetCurrentUserAuthorization =
    hasCapability(USER_PERMISSION_UPDATE_PERMISSION)
    && Boolean(selectedUserId)
    && resolvedActiveRole !== 'STUDENT';

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
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          role_codes: getNextAssignableRoleCodes(getManagedRoleCodes(user.roles), resolvedActiveRole),
        },
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
      await updateUser.mutateAsync({
        id: user.id,
        data: { role_codes: nextRoles },
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
      await updateUser.mutateAsync({
        id: selectedUserDetail.id,
        data: { role_codes: nextRoles },
      });
      const nextEditorRoleCode = getNextUserPermissionEditorRoleCode({
        currentRoleCode: resolvedActiveRole,
        nextRoleCodes: nextRoles,
        toggledRoleCode: roleCode,
      });
      if (nextEditorRoleCode) {
        setActiveRole(nextEditorRoleCode);
        setSelectedUserId(selectedUserDetail.id);
      } else {
        setSelectedUserId(null);
      }
    } catch (error) {
      showApiError(error);
    }
  };

  /**
   * 将选中用户的授权重置为当前管理角色模板。
   */
  const handleResetCurrentUserAuthorization = async () => {
    if (!selectedUserId || isResetting || !canResetCurrentUserAuthorization) {
      setResetDialogOpen(false);
      return;
    }

    setIsResetting(true);
    try {
      await resetUserAuthorization.mutateAsync(selectedUserId);
      await refreshUser();
      await refetchSelectedUserDetail();
      setResetDialogOpen(false);
    } catch (error) {
      showApiError(error);
    } finally {
      setIsResetting(false);
    }
  };

  return {
    canManageRoleMembers,
    canViewUserAuthorization,
    candidateUsers,
    canResetCurrentUserAuthorization,
    departments,
    groupedMembersByRole,
    handleAssignRole,
    handleRemoveRole,
    handleResetCurrentUserAuthorization,
    handleSelectMember,
    handleSelectRole,
    handleUserRoleToggle,
    isAssigningRoles: updateUser.isPending,
    isLoadingMembers,
    isLoadingSelectedUser,
    isResetting,
    isSavingCurrentRole,
    isViewingUserAuthorization: Boolean(selectedUserId),
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
  };
}
