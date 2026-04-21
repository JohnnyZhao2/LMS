import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode, UserList } from '@/types/common';
import { isAllowedDepartmentCode, useDepartments, useRoles, useUserDetail, useUsers } from '@/entities/user/api/get-users';
import { useAssignRoles } from '@/entities/user/api/manage-users';
import { useAuth } from '@/session/auth/auth-context';
import {
  useRevokeUserPermissionOverride,
  useRevokeUserScopeGroupOverride,
  useUserPermissionOverrides,
  useUserScopeGroupOverrides,
} from '@/entities/authorization/api/authorization';
import { ASSIGNABLE_ROLES } from '@/lib/role-config';
import { showApiError } from '@/utils/error-handler';
import { buildPermissionModuleSections } from '@/entities/authorization/utils/permission-sections';
import {
  getManagedRoleCodes,
  getSelectedBusinessRoleCode,
} from '@/entities/authorization/utils/user-role-assignment';

interface UseRolePermissionTemplateStateParams {
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  permissionCodesByRole: Partial<Record<RoleCode, string[]>>;
  savingRoleCodes: RoleCode[];
  initialRoleCode?: RoleCode | null;
  initialSelectedUserId?: number | null;
}

export function useRolePermissionTemplateState({
  roleCodes,
  permissionCatalog,
  permissionCodesByRole,
  savingRoleCodes,
  initialRoleCode = null,
  initialSelectedUserId = null,
}: UseRolePermissionTemplateStateParams) {
  const { hasCapability, refreshUser } = useAuth();
  const canManageRoleMembers = hasCapability('user.authorize');
  const [activeRole, setActiveRole] = useState<RoleCode | null>(initialRoleCode);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialRoleCode && initialRoleCode !== 'STUDENT' ? initialSelectedUserId : null,
  );
  const [workbenchElement, setWorkbenchElement] = useState<HTMLDivElement | null>(null);
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResettingOverrides, setIsResettingOverrides] = useState(false);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const assignRoles = useAssignRoles();
  const revokeUserOverride = useRevokeUserPermissionOverride();
  const revokeUserScopeGroupOverride = useRevokeUserScopeGroupOverride();

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
    { enabled: Boolean(resolvedActiveRole) },
  );
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();
  const {
    data: selectedUserDetail,
    isLoading: isLoadingSelectedUser,
    refetch: refetchSelectedUserDetail,
  } = useUserDetail(selectedUserId ?? 0);
  const {
    data: selectedUserPermissionOverrides = [],
    refetch: refetchSelectedUserPermissionOverrides,
  } = useUserPermissionOverrides(selectedUserId, Boolean(selectedUserId));
  const {
    data: selectedUserScopeGroupOverrides = [],
    refetch: refetchSelectedUserScopeGroupOverrides,
  } = useUserScopeGroupOverrides(selectedUserId, Boolean(selectedUserId));

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
        .filter((user) => user.roles.every((role) => !ASSIGNABLE_ROLES.includes(role.code as RoleCode)))
        .filter((user) => isAllowedDepartmentCode(user.department?.code))
        .filter((user) => {
          if (resolvedActiveRole === 'TEAM_MANAGER') {
            return !hasActiveTeamManager;
          }
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
  const selectedBusinessRoleCode = useMemo<RoleCode | null>(
    () => getSelectedBusinessRoleCode(selectedUserDetail?.roles ?? []),
    [selectedUserDetail],
  );
  const currentRolePermissionOverrides = useMemo(
    () => selectedUserPermissionOverrides.filter((override) => (
      override.is_active && override.applies_to_role === resolvedActiveRole
    )),
    [resolvedActiveRole, selectedUserPermissionOverrides],
  );
  const currentRoleScopeOverrides = useMemo(
    () => selectedUserScopeGroupOverrides.filter((override) => (
      override.is_active && override.applies_to_role === resolvedActiveRole
    )),
    [resolvedActiveRole, selectedUserScopeGroupOverrides],
  );
  const canResetCurrentRoleOverrides = currentRolePermissionOverrides.length > 0 || currentRoleScopeOverrides.length > 0;

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
    const nextRoles = selectedBusinessRoleCode === roleCode ? [] : [roleCode];
    const currentRoleCodes = getManagedRoleCodes(selectedUserDetail.roles);
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
    } catch (error) {
      showApiError(error);
    }
  };

  const handleResetCurrentRoleOverrides = async () => {
    if (!selectedUserId || isResettingOverrides || !canResetCurrentRoleOverrides) {
      setResetDialogOpen(false);
      return;
    }

    setIsResettingOverrides(true);
    try {
      await Promise.all([
        ...currentRolePermissionOverrides.map((override) => (
          revokeUserOverride.mutateAsync({ userId: selectedUserId, overrideId: override.id })
        )),
        ...currentRoleScopeOverrides.map((override) => (
          revokeUserScopeGroupOverride.mutateAsync({ userId: selectedUserId, overrideId: override.id })
        )),
      ]);
      await refreshUser();
      await Promise.all([
        refetchSelectedUserDetail(),
        refetchSelectedUserPermissionOverrides(),
        refetchSelectedUserScopeGroupOverrides(),
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
    isAssigningRoles: assignRoles.isPending,
    isLoadingMembers,
    isLoadingSelectedUser,
    isResettingOverrides,
    isSavingCurrentRole,
    isViewingUserOverrides: Boolean(selectedUserId),
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
