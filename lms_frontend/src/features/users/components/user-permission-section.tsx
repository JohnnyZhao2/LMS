import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Settings2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useCreateUserPermissionOverride,
  usePermissionCatalog,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
  useUserPermissionOverrides,
} from '@/features/authorization/api/authorization';
import { getModulePresentation } from '@/features/authorization/constants/permission-presentation';
import { cn } from '@/lib/utils';
import type {
  CreateUserPermissionOverrideRequest,
  PermissionOverrideScope,
  RoleCode,
} from '@/types/api';
import type { Department, Role, UserList as UserDetail } from '@/types/common';
import { showApiError } from '@/utils/error-handler';

import { useUsers } from '../api/get-users';
import {
  DEFAULT_ROLE_SCOPE_TYPES,
  PERMISSION_SCOPE_ORDER,
  formatScopeSummary,
  normalizeScopeTypes,
  sameScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';

interface UserPermissionSectionProps {
  userId?: number;
  userDetail?: UserDetail;
  roles: Role[];
  departments: Department[];
  selectedRoleCodes: RoleCode[];
  departmentId?: number;
  isSuperuserAccount: boolean;
  dialogContentElement: HTMLDivElement | null;
}

export const UserPermissionSection: React.FC<UserPermissionSectionProps> = ({
  userId,
  userDetail,
  roles,
  departments,
  selectedRoleCodes,
  departmentId,
  isSuperuserAccount,
  dialogContentElement,
}) => {
  const { hasPermission, refreshUser } = useAuth();
  const canViewOverride =
    hasPermission('authorization.user_override.view')
    || hasPermission('authorization.user_override.create')
    || hasPermission('authorization.user_override.revoke');
  const canCreateOverride = hasPermission('authorization.user_override.create');
  const canRevokeOverride = hasPermission('authorization.user_override.revoke');
  const canViewRoleTemplate =
    hasPermission('authorization.role_template.view')
    || hasPermission('authorization.role_template.update');
  const shouldLoadUserOverrides = Boolean(userId) && canViewOverride;

  const { data: permissionCatalog = [] } = usePermissionCatalog(undefined, shouldLoadUserOverrides);
  const { data: userOverrides = [], isLoading: isLoadingUserOverrides } = useUserPermissionOverrides(
    userId ?? null,
    false,
    shouldLoadUserOverrides,
  );
  const createUserOverride = useCreateUserPermissionOverride();
  const revokeUserOverride = useRevokeUserPermissionOverride();
  const [selectedPermissionModule, setSelectedPermissionModule] = useState('');
  const [selectedPermissionRole, setSelectedPermissionRole] = useState<RoleCode>('STUDENT');
  const [selectedPermissionScopes, setSelectedPermissionScopes] = useState<PermissionOverrideScope[]>([]);
  const [selectedScopeUserIds, setSelectedScopeUserIds] = useState<number[]>([]);
  const [scopeUserSearch, setScopeUserSearch] = useState('');
  const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
  const [scopeUserFilter, setScopeUserFilter] = useState<string>('all');
  const [permissionToggleLoading, setPermissionToggleLoading] = useState<Record<string, boolean>>({});

  const { data: scopeUsers = [], isLoading: isScopeUsersLoading } = useUsers(
    {},
    { enabled: shouldLoadUserOverrides },
  );

  const roleNameMap = useMemo(() => {
    const nameMap = new Map<string, string>();
    roles.forEach((role) => {
      nameMap.set(role.code, role.name);
    });
    if (!nameMap.has('STUDENT')) {
      nameMap.set('STUDENT', '学员');
    }
    return nameMap;
  }, [roles]);

  const previewRoleCodes = useMemo<RoleCode[]>(() => {
    if (isSuperuserAccount) {
      return ['ADMIN'];
    }
    return Array.from(new Set<RoleCode>(['STUDENT', ...selectedRoleCodes]));
  }, [selectedRoleCodes, isSuperuserAccount]);

  const roleTemplateQueries = useRolePermissionTemplates(
    previewRoleCodes,
    shouldLoadUserOverrides && canViewRoleTemplate,
  );

  const roleTemplatePermissionCodeMap = useMemo(() => {
    const templateMap = new Map<RoleCode, string[]>();
    previewRoleCodes.forEach((roleCode, index) => {
      templateMap.set(roleCode, roleTemplateQueries[index]?.data?.permission_codes ?? []);
    });
    return templateMap;
  }, [previewRoleCodes, roleTemplateQueries]);

  const roleTemplateDefaultScopeMap = useMemo(() => {
    const scopeMap = new Map<RoleCode, PermissionOverrideScope[]>();
    previewRoleCodes.forEach((roleCode, index) => {
      scopeMap.set(
        roleCode,
        roleTemplateQueries[index]?.data?.default_scope_types ?? DEFAULT_ROLE_SCOPE_TYPES[roleCode] ?? [],
      );
    });
    return scopeMap;
  }, [previewRoleCodes, roleTemplateQueries]);

  const overrideRoleOptions = useMemo<Array<{ code: RoleCode; label: string }>>(
    () => previewRoleCodes.map((roleCode) => ({
      code: roleCode,
      label: roleNameMap.get(roleCode) ?? roleCode,
    })),
    [previewRoleCodes, roleNameMap],
  );

  const normalizedSelectedPermissionRole = useMemo<RoleCode>(() => {
    if (previewRoleCodes.includes(selectedPermissionRole)) {
      return selectedPermissionRole;
    }
    return previewRoleCodes[0] ?? 'STUDENT';
  }, [selectedPermissionRole, previewRoleCodes]);

  useEffect(() => {
    if (!previewRoleCodes.includes(selectedPermissionRole)) {
      setSelectedPermissionRole(previewRoleCodes[0] ?? 'STUDENT');
    }
  }, [previewRoleCodes, selectedPermissionRole]);

  const selectedRoleDefaultScopeTypes = useMemo(
    () => normalizeScopeTypes(
      roleTemplateDefaultScopeMap.get(normalizedSelectedPermissionRole)
        ?? DEFAULT_ROLE_SCOPE_TYPES[normalizedSelectedPermissionRole]
        ?? [],
    ),
    [normalizedSelectedPermissionRole, roleTemplateDefaultScopeMap],
  );
  const selectedRoleDefaultScopeKey = selectedRoleDefaultScopeTypes.join('|');

  useEffect(() => {
    const ownerUserId = userId ?? userDetail?.id ?? null;
    const ownerDepartmentId = departmentId ?? userDetail?.department?.id ?? null;
    const matchedUserIdSet = new Set<number>();

    for (const scopeType of selectedRoleDefaultScopeTypes) {
      if (scopeType === 'ALL') {
        scopeUsers.forEach((scopeUser) => matchedUserIdSet.add(scopeUser.id));
        continue;
      }
      if (scopeType === 'MENTEES' && ownerUserId) {
        scopeUsers.forEach((scopeUser) => {
          if (scopeUser.mentor?.id === ownerUserId) {
            matchedUserIdSet.add(scopeUser.id);
          }
        });
        continue;
      }
      if (scopeType === 'DEPARTMENT' && ownerDepartmentId) {
        scopeUsers.forEach((scopeUser) => {
          if (scopeUser.department.id === ownerDepartmentId) {
            matchedUserIdSet.add(scopeUser.id);
          }
        });
      }
    }

    const matchedScopeUserIds = Array.from(matchedUserIdSet).sort((left, right) => left - right);

    setSelectedPermissionScopes((prev) => (
      sameScopeTypes(prev, selectedRoleDefaultScopeTypes) ? prev : selectedRoleDefaultScopeTypes
    ));
    setSelectedScopeUserIds((prev) => (
      sameScopeUserIds(prev, matchedScopeUserIds) ? prev : matchedScopeUserIds
    ));
    setScopeUserSearch((prev) => (prev ? '' : prev));
    setShowScopeAdjustPanel((prev) => (prev ? false : prev));
    setScopeUserFilter((prev) => (prev !== 'all' ? 'all' : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSelectedPermissionRole, selectedRoleDefaultScopeKey, scopeUsers.length]);

  const permissionModules = useMemo(
    () => Array.from(new Set(permissionCatalog.map((item) => item.module).filter(Boolean))),
    [permissionCatalog],
  );

  const activePermissionModule = useMemo(() => {
    if (selectedPermissionModule && permissionModules.includes(selectedPermissionModule)) {
      return selectedPermissionModule;
    }
    return permissionModules[0] ?? '';
  }, [permissionModules, selectedPermissionModule]);

  const activeModulePermissions = useMemo(
    () => permissionCatalog.filter((permission) => permission.module === activePermissionModule),
    [permissionCatalog, activePermissionModule],
  );

  const activeScopedOverrides = useMemo(
    () => userOverrides.filter((override) => (
      override.is_active && override.applies_to_role === normalizedSelectedPermissionRole
    )),
    [userOverrides, normalizedSelectedPermissionRole],
  );

  const activeScopeAllowOverrides = useMemo(
    () => activeScopedOverrides.filter((override) => override.effect === 'ALLOW'),
    [activeScopedOverrides],
  );

  const activeScopeDenyOverrides = useMemo(
    () => activeScopedOverrides.filter((override) => override.effect === 'DENY'),
    [activeScopedOverrides],
  );

  const roleTemplatePermissionCodes = useMemo(() => {
    if (!canViewRoleTemplate) {
      return new Set<string>();
    }
    return new Set(roleTemplatePermissionCodeMap.get(normalizedSelectedPermissionRole) ?? []);
  }, [canViewRoleTemplate, normalizedSelectedPermissionRole, roleTemplatePermissionCodeMap]);

  const isPermissionToggling = (permissionCode: string) =>
    Boolean(permissionToggleLoading[`${normalizedSelectedPermissionRole}:${permissionCode}`]);

  const getPermissionTemplateCount = (roleCode: RoleCode) =>
    (roleTemplatePermissionCodeMap.get(roleCode) ?? []).length;

  const getPresetMatchedScopeUserIds = (scopeTypes: PermissionOverrideScope[]): number[] => {
    const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
    if (normalizedScopeTypes.length === 0) {
      return [];
    }

    const ownerUserId = userId ?? userDetail?.id ?? null;
    const ownerDepartmentId = departmentId ?? userDetail?.department?.id ?? null;
    const matchedUserIds = new Set<number>();

    for (const scopeType of normalizedScopeTypes) {
      if (scopeType === 'ALL') {
        scopeUsers.forEach((scopeUser) => matchedUserIds.add(scopeUser.id));
        continue;
      }

      if (scopeType === 'MENTEES' && ownerUserId) {
        scopeUsers.forEach((scopeUser) => {
          if (scopeUser.mentor?.id === ownerUserId) {
            matchedUserIds.add(scopeUser.id);
          }
        });
        continue;
      }

      if (scopeType === 'DEPARTMENT' && ownerDepartmentId) {
        scopeUsers.forEach((scopeUser) => {
          if (scopeUser.department.id === ownerDepartmentId) {
            matchedUserIds.add(scopeUser.id);
          }
        });
        continue;
      }

      if (scopeType === 'SELF' && ownerUserId) {
        matchedUserIds.add(ownerUserId);
      }
    }

    return Array.from(matchedUserIds).sort((left, right) => left - right);
  };

  const applyScopePresetWithAutoSelection = (scopeTypes: PermissionOverrideScope[]) => {
    const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
    const matchedScopeUserIds = getPresetMatchedScopeUserIds(normalizedScopeTypes);
    setSelectedPermissionScopes(normalizedScopeTypes);
    setSelectedScopeUserIds(matchedScopeUserIds);
  };

  const formatScopeSummaryWithDedup = (
    scopeTypes: PermissionOverrideScope[],
    scopeUserIds: number[] = [],
  ): string => {
    const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
    if (!normalizedScopeTypes.includes('EXPLICIT_USERS')) {
      return formatScopeSummary(normalizedScopeTypes, scopeUserIds);
    }

    const standardScopeTypes = normalizedScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS');
    const coveredUserIdSet = new Set(getPresetMatchedScopeUserIds(standardScopeTypes));
    const explicitExtraUserIds = Array.from(new Set(scopeUserIds)).filter(
      (scopeUserId) => !coveredUserIdSet.has(scopeUserId),
    );

    const displayScopeTypes = explicitExtraUserIds.length > 0
      ? normalizedScopeTypes
      : normalizedScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS');

    return formatScopeSummary(displayScopeTypes, explicitExtraUserIds);
  };

  const scopeFilterOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      { value: 'all', label: '全部' },
      { value: 'mentees', label: '学员' },
    ];
    departments.forEach((dept) => {
      options.push({ value: `dept_${dept.id}`, label: dept.name });
    });
    return options;
  }, [departments]);

  const handleScopeFilterChange = (filterValue: string) => {
    setScopeUserFilter((prev) => (prev === filterValue ? 'all' : filterValue));
  };

  const filteredScopeUsers = useMemo(() => {
    const keyword = scopeUserSearch.trim().toLowerCase();
    const ownerUserId = userId ?? userDetail?.id ?? null;

    return scopeUsers.filter((scopeUser) => {
      if (scopeUserFilter === 'mentees') {
        if (!ownerUserId || scopeUser.mentor?.id !== ownerUserId) return false;
      } else if (scopeUserFilter !== 'all') {
        const deptId = Number(scopeUserFilter.replace('dept_', ''));
        if (scopeUser.department?.id !== deptId) return false;
      }

      if (!keyword) return true;

      return (
        scopeUser.username.toLowerCase().includes(keyword)
        || scopeUser.employee_id.toLowerCase().includes(keyword)
      );
    });
  }, [scopeUserFilter, scopeUserSearch, scopeUsers, userId, userDetail]);

  const filteredScopeUserIds = useMemo(
    () => filteredScopeUsers.map((scopeUser) => scopeUser.id),
    [filteredScopeUsers],
  );
  const selectedFilteredScopeCount = useMemo(
    () => filteredScopeUserIds.filter((scopeUserId) => selectedScopeUserIds.includes(scopeUserId)).length,
    [filteredScopeUserIds, selectedScopeUserIds],
  );
  const isAllFilteredScopeUsersSelected = filteredScopeUserIds.length > 0
    && selectedFilteredScopeCount === filteredScopeUserIds.length;
  const hasPartialFilteredScopeSelection = selectedFilteredScopeCount > 0
    && !isAllFilteredScopeUsersSelected;

  const toggleSelectAllFilteredScopeUsers = () => {
    if (filteredScopeUserIds.length === 0) {
      return;
    }

    setSelectedScopeUserIds((prev) => {
      const nextUserIdSet = new Set(prev);
      const shouldUnselectAll = filteredScopeUserIds.every((scopeUserId) => nextUserIdSet.has(scopeUserId));

      if (shouldUnselectAll) {
        filteredScopeUserIds.forEach((scopeUserId) => nextUserIdSet.delete(scopeUserId));
      } else {
        filteredScopeUserIds.forEach((scopeUserId) => nextUserIdSet.add(scopeUserId));
      }

      return Array.from(nextUserIdSet).sort((left, right) => left - right);
    });

    if (!selectedPermissionScopes.includes('EXPLICIT_USERS')) {
      setSelectedPermissionScopes((prev) => normalizeScopeTypes([...prev, 'EXPLICIT_USERS']));
    }
  };

  const toggleSelectedPermissionScope = (scopeType: PermissionOverrideScope) => {
    setSelectedPermissionScopes((prev) => {
      const nextScopeTypes = prev.includes(scopeType)
        ? prev.filter((item) => item !== scopeType)
        : [...prev, scopeType];
      const normalizedScopeTypes = normalizeScopeTypes(nextScopeTypes);

      if (!normalizedScopeTypes.includes('EXPLICIT_USERS')) {
        setSelectedScopeUserIds([]);
        setScopeUserSearch('');
      }

      return normalizedScopeTypes;
    });
  };

  const applyDefaultScopePreset = () => {
    applyScopePresetWithAutoSelection(selectedRoleDefaultScopeTypes);
    setScopeUserSearch('');
  };

  const matchesSelectedScope = (scopeType: PermissionOverrideScope, scopeUserIds: number[]) => {
    if (scopeType === 'SELF') {
      return selectedPermissionScopes.length === 0;
    }
    if (scopeType !== 'EXPLICIT_USERS') {
      return selectedPermissionScopes.includes(scopeType);
    }
    return selectedPermissionScopes.includes('EXPLICIT_USERS') && sameScopeUserIds(scopeUserIds, selectedScopeUserIds);
  };

  const getPermissionState = (permissionCode: string) => {
    const fromTemplate = roleTemplatePermissionCodes.has(permissionCode);
    const allowOverrides = activeScopeAllowOverrides.filter((override) => override.permission_code === permissionCode);
    const denyOverrides = activeScopeDenyOverrides.filter((override) => override.permission_code === permissionCode);
    const selectedStandardScopeTypes: PermissionOverrideScope[] = normalizeScopeTypes(
      selectedPermissionScopes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS'),
    );
    const isSelfOnlySelection = selectedPermissionScopes.length === 0;
    const inheritedScopeTypes: PermissionOverrideScope[] = fromTemplate
      ? selectedRoleDefaultScopeTypes.filter((scopeType) => scopeType !== 'EXPLICIT_USERS')
      : [];

    const isStandardScopeGranted = (scopeType: PermissionOverrideScope) => {
      const hasDenyOverride = denyOverrides.some((override) => override.scope_type === scopeType);
      if (hasDenyOverride) {
        return false;
      }
      if (inheritedScopeTypes.includes(scopeType)) {
        return true;
      }
      return allowOverrides.some((override) => override.scope_type === scopeType);
    };

    const hasExactExplicitAllow = allowOverrides.some(
      (override) => override.scope_type === 'EXPLICIT_USERS' && sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds),
    );
    const hasExactExplicitDeny = denyOverrides.some(
      (override) => override.scope_type === 'EXPLICIT_USERS' && sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds),
    );
    const hasSelfAllow = allowOverrides.some((override) => override.scope_type === 'SELF');
    const hasSelfDeny = denyOverrides.some((override) => override.scope_type === 'SELF');
    const hasNonSelfAllow = allowOverrides.some((override) => override.scope_type !== 'SELF');
    const isSelfGranted = !hasSelfDeny && (fromTemplate || hasSelfAllow || hasNonSelfAllow);

    const selectedAllowOverrides = allowOverrides.filter((override) =>
      matchesSelectedScope(override.scope_type, override.scope_user_ids),
    );
    const selectedDenyOverrides = denyOverrides.filter((override) =>
      matchesSelectedScope(override.scope_type, override.scope_user_ids),
    );

    const effectiveStandardScopeTypes = normalizeScopeTypes(
      PERMISSION_SCOPE_ORDER.filter(
        (scopeType) => scopeType !== 'EXPLICIT_USERS' && isStandardScopeGranted(scopeType),
      ),
    );
    const effectiveExplicitUserIds = Array.from(
      new Set(
        allowOverrides
          .filter((override) => override.scope_type === 'EXPLICIT_USERS')
          .flatMap((override) => override.scope_user_ids),
      ),
    ).sort((left, right) => left - right);

    const addedScopeTypes = normalizeScopeTypes(
      PERMISSION_SCOPE_ORDER.filter((scopeType) => (
        scopeType !== 'EXPLICIT_USERS'
        && allowOverrides.some((override) => override.scope_type === scopeType)
        && !inheritedScopeTypes.includes(scopeType)
      )),
    );
    const removedScopeTypes = normalizeScopeTypes(
      PERMISSION_SCOPE_ORDER.filter((scopeType) => (
        scopeType !== 'EXPLICIT_USERS'
        && denyOverrides.some((override) => override.scope_type === scopeType)
        && inheritedScopeTypes.includes(scopeType)
      )),
    );

    const checked = isSelfOnlySelection
      ? isSelfGranted
      : (
        selectedStandardScopeTypes.every((scopeType) => isStandardScopeGranted(scopeType))
        && (
          !selectedPermissionScopes.includes('EXPLICIT_USERS')
          || (selectedScopeUserIds.length > 0 && hasExactExplicitAllow && !hasExactExplicitDeny)
        )
      );

    const missingSelectedAllowScopeTypes = selectedStandardScopeTypes.filter((scopeType) => (
      !inheritedScopeTypes.includes(scopeType)
      && !allowOverrides.some((override) => override.scope_type === scopeType)
    ));
    const inheritedSelectedScopeTypes = selectedStandardScopeTypes.filter((scopeType) =>
      inheritedScopeTypes.includes(scopeType),
    );

    return {
      checked,
      fromTemplate,
      allowOverrides,
      denyOverrides,
      selectedAllowOverrides,
      selectedDenyOverrides,
      inheritedSelectedScopeTypes,
      isSelfOnlySelection,
      hasSelfAllow,
      hasNonSelfAllow,
      addedScopeTypes,
      removedScopeTypes,
      effectiveStandardScopeTypes,
      effectiveExplicitUserIds,
      hasExactExplicitAllow,
      hasExactExplicitDeny,
      missingSelectedAllowScopeTypes,
    };
  };

  const toggleScopeUser = (scopeUserId: number) => {
    setSelectedScopeUserIds((prev) => (
      prev.includes(scopeUserId)
        ? prev.filter((id) => id !== scopeUserId)
        : [...prev, scopeUserId]
    ));
  };

  const handlePermissionToggle = async (permissionCode: string, nextChecked: boolean) => {
    if (!userId) return;

    if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length === 0) {
      toast.error('请选择至少一个指定用户');
      return;
    }

    const scopeRole = normalizedSelectedPermissionRole;
    const key = `${scopeRole}:${permissionCode}`;
    const {
      checked: currentChecked,
      fromTemplate,
      selectedAllowOverrides,
      selectedDenyOverrides,
      inheritedSelectedScopeTypes,
      isSelfOnlySelection,
      hasSelfAllow,
      hasNonSelfAllow,
      hasExactExplicitAllow,
      missingSelectedAllowScopeTypes,
    } = getPermissionState(permissionCode);

    if (currentChecked === nextChecked) return;

    const needsCreateWhenEnable = missingSelectedAllowScopeTypes.length > 0
      || (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow);
    const needsCreateWhenDisable = fromTemplate && inheritedSelectedScopeTypes.length > 0;
    const needsRevokeWhenEnable = selectedDenyOverrides.length > 0;
    const needsRevokeWhenDisable = selectedAllowOverrides.length > 0;

    if (nextChecked && needsRevokeWhenEnable && !canRevokeOverride) return;
    if (nextChecked && needsCreateWhenEnable && !canCreateOverride) return;
    if (!nextChecked && needsRevokeWhenDisable && !canRevokeOverride) return;
    if (!nextChecked && needsCreateWhenDisable && !canCreateOverride) return;

    setPermissionToggleLoading((prev) => ({ ...prev, [key]: true }));
    try {
      if (isSelfOnlySelection) {
        if (nextChecked) {
          await Promise.all(
            selectedDenyOverrides.map((override) =>
              revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
            ),
          );

          if (!fromTemplate && !hasSelfAllow && !hasNonSelfAllow) {
            await createUserOverride.mutateAsync({
              userId,
              data: {
                permission_code: permissionCode,
                effect: 'ALLOW',
                applies_to_role: scopeRole,
                scope_type: 'SELF',
                scope_user_ids: [],
              },
            });
          }
        } else {
          await Promise.all(
            selectedAllowOverrides.map((override) =>
              revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
            ),
          );

          if (fromTemplate || hasNonSelfAllow) {
            await createUserOverride.mutateAsync({
              userId,
              data: {
                permission_code: permissionCode,
                effect: 'DENY',
                applies_to_role: scopeRole,
                scope_type: 'SELF',
                scope_user_ids: [],
              },
            });
          }
        }

        await refreshUser();
        return;
      }

      if (nextChecked) {
        await Promise.all(
          selectedDenyOverrides.map((override) =>
            revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
          ),
        );

        const payloads: CreateUserPermissionOverrideRequest[] = [
          ...missingSelectedAllowScopeTypes.map((scopeType) => ({
            permission_code: permissionCode,
            effect: 'ALLOW' as const,
            applies_to_role: scopeRole,
            scope_type: scopeType,
            scope_user_ids: [],
          })),
        ];

        if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow) {
          payloads.push({
            permission_code: permissionCode,
            effect: 'ALLOW',
            applies_to_role: scopeRole,
            scope_type: 'EXPLICIT_USERS',
            scope_user_ids: selectedScopeUserIds,
          });
        }

        await Promise.all(
          payloads.map((payload) => createUserOverride.mutateAsync({ userId, data: payload })),
        );
      } else {
        await Promise.all(
          selectedAllowOverrides.map((override) =>
            revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
          ),
        );

        const payloads: CreateUserPermissionOverrideRequest[] = inheritedSelectedScopeTypes.map((scopeType) => ({
          permission_code: permissionCode,
          effect: 'DENY',
          applies_to_role: scopeRole,
          scope_type: scopeType,
          scope_user_ids: [],
        }));

        await Promise.all(
          payloads.map((payload) => createUserOverride.mutateAsync({ userId, data: payload })),
        );
      }
      await refreshUser();
    } catch (error) {
      showApiError(error);
    } finally {
      setPermissionToggleLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <KeyRound className="w-4 h-4 text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">用户权限自定义</h3>
        </div>

        <div className="flex items-center gap-6 flex-1 justify-end max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">生效角色</span>
            <Select
              value={normalizedSelectedPermissionRole}
              onValueChange={(value) => setSelectedPermissionRole(value as RoleCode)}
            >
              <SelectTrigger className="h-9 min-w-[140px] rounded-xl border-slate-200/70 bg-white text-xs font-bold text-slate-700 transition-all hover:border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[180px] overflow-hidden rounded-xl border-slate-200 shadow-xl">
                {overrideRoleOptions.map((item) => (
                  <SelectItem key={item.code} value={item.code} className="py-2.5 text-xs font-medium">
                    {item.label} <span className="ml-1 text-slate-400">({getPermissionTemplateCount(item.code)})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-[320px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">扩展范围</span>
            <Popover open={showScopeAdjustPanel} onOpenChange={setShowScopeAdjustPanel} modal={false}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex h-9 w-full items-center justify-between rounded-xl border px-4 text-xs transition-all duration-200',
                    showScopeAdjustPanel
                      ? 'border-primary/40 bg-primary/[0.04] text-primary ring-4 ring-primary/5'
                      : 'border-slate-200/70 bg-white text-slate-700 hover:border-primary/30 hover:bg-slate-50/50',
                  )}
                >
                  <span className="font-bold line-clamp-1 text-left">
                    {formatScopeSummaryWithDedup(selectedPermissionScopes, selectedScopeUserIds)}
                  </span>
                  <Settings2
                    className={cn(
                      'ml-2 h-3.5 w-3.5 shrink-0 transition-all duration-300',
                      showScopeAdjustPanel ? 'text-primary rotate-90' : 'text-slate-400',
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[360px] p-0 rounded-2xl shadow-2xl shadow-slate-200/60 border-slate-200/50 overflow-hidden"
                container={dialogContentElement}
                sideOffset={8}
              >
                <div className="px-4 pt-3.5 pb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {scopeFilterOptions.map((option) => {
                      const isActive = scopeUserFilter === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleScopeFilterChange(option.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-200 active:scale-95',
                            isActive
                              ? 'border-primary/30 bg-gradient-to-b from-primary/[0.08] to-primary/[0.15] text-primary shadow-sm shadow-primary/10'
                              : 'border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                    {!sameScopeTypes(selectedPermissionScopes, selectedRoleDefaultScopeTypes) && (
                      <button
                        type="button"
                        onClick={() => {
                          applyDefaultScopePreset();
                          setScopeUserFilter('all');
                        }}
                        className="ml-1 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors duration-200"
                      >
                        重置
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100/80 bg-slate-50/30">
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <Input
                      value={scopeUserSearch}
                      onChange={(e) => setScopeUserSearch(e.target.value)}
                      placeholder="搜索用户..."
                      className="h-8 flex-1 min-w-0 pl-3 text-[11px] bg-white border-slate-200/60 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/30 placeholder:text-slate-300"
                    />
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0 px-2 py-1.5 rounded-lg hover:bg-white transition-colors">
                      <Checkbox
                        checked={isAllFilteredScopeUsersSelected ? true : hasPartialFilteredScopeSelection ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAllFilteredScopeUsers}
                        className="rounded-[3px]"
                      />
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
                        {selectedFilteredScopeCount}/{filteredScopeUsers.length}
                      </span>
                    </label>
                  </div>

                  <div
                    className="max-h-[200px] overflow-y-auto overscroll-contain px-3 pb-3 space-y-0.5 scrollbar-subtle"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {isScopeUsersLoading ? (
                      <div className="py-6 text-center">
                        <Loader2 className="w-4 h-4 text-slate-300 animate-spin mx-auto mb-1.5" />
                        <span className="text-[11px] text-slate-400">加载用户列表...</span>
                      </div>
                    ) : filteredScopeUsers.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                          <Users className="w-4 h-4 text-slate-300" />
                        </div>
                        无匹配用户
                      </div>
                    ) : (
                      filteredScopeUsers.map((scopeUser) => {
                        const selected = selectedScopeUserIds.includes(scopeUser.id);
                        return (
                          <label
                            key={scopeUser.id}
                            className={cn(
                              'flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition-all duration-150',
                              selected
                                ? 'bg-primary/[0.06] border border-primary/10'
                                : 'hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm',
                            )}
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => {
                                toggleScopeUser(scopeUser.id);
                                if (!selectedPermissionScopes.includes('EXPLICIT_USERS')) {
                                  toggleSelectedPermissionScope('EXPLICIT_USERS');
                                }
                              }}
                              className="rounded-[3px] shrink-0"
                            />
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors',
                                  selected
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-slate-100 text-slate-400',
                                )}
                              >
                                {scopeUser.username.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    'text-[12px] font-semibold block truncate transition-colors',
                                    selected ? 'text-primary' : 'text-slate-700',
                                  )}
                                >
                                  {scopeUser.username}
                                </span>
                                {'department' in scopeUser && scopeUser.department && (
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {(scopeUser.department as { name: string }).name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {!canViewOverride ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
          您没有“用户权限自定义配置”权限，仅可查看上方默认角色包信息。
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-8 items-start relative">
          <aside className="sticky top-4 space-y-1">
            {permissionModules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                暂无模块数据
              </div>
            ) : (
              permissionModules.map((moduleName) => {
                const active = activePermissionModule === moduleName;
                const moduleLabel = getModulePresentation(moduleName).label;
                return (
                  <button
                    key={moduleName}
                    type="button"
                    onClick={() => setSelectedPermissionModule(moduleName)}
                    className={cn(
                      'w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-all duration-300',
                      active
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                    )}
                  >
                    {moduleLabel}
                  </button>
                );
              })
            )}
          </aside>

          <div className="relative space-y-4">
            {!canViewRoleTemplate && (
              <div className="px-2">
                <p className="text-[11px] text-slate-400">
                  当前账号没有角色模板查看权限，下面仅准确展示用户自定义覆盖。
                </p>
              </div>
            )}

            <div>
              {activeModulePermissions.length === 0 ? (
                <div className="py-12 text-center text-sm font-medium text-slate-400">当前模块暂无可配置权限</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {activeModulePermissions.map((permission) => {
                    const permissionState = getPermissionState(permission.code);
                    const checked = permissionState.checked;
                    const loading = isPermissionToggling(permission.code);
                    const needsCreateToEnable = permissionState.missingSelectedAllowScopeTypes.length > 0
                      || (
                        permissionState.isSelfOnlySelection
                        && !permissionState.fromTemplate
                        && !permissionState.hasSelfAllow
                        && !permissionState.hasNonSelfAllow
                      )
                      || (
                        selectedPermissionScopes.includes('EXPLICIT_USERS')
                        && selectedScopeUserIds.length > 0
                        && !permissionState.hasExactExplicitAllow
                      );
                    const needsCreateToDisable = (
                      permissionState.isSelfOnlySelection
                      && (permissionState.fromTemplate || permissionState.hasNonSelfAllow)
                    ) || (
                      permissionState.fromTemplate
                      && permissionState.inheritedSelectedScopeTypes.length > 0
                    );
                    const needsRevokeToEnable = permissionState.selectedDenyOverrides.length > 0;
                    const needsRevokeToDisable = permissionState.selectedAllowOverrides.length > 0;
                    const effectiveScopeTypes = permissionState.effectiveExplicitUserIds.length > 0
                      ? [...permissionState.effectiveStandardScopeTypes, 'EXPLICIT_USERS' as PermissionOverrideScope]
                      : permissionState.effectiveStandardScopeTypes;
                    const addedScopeTypes = permissionState.effectiveExplicitUserIds.length > 0
                      ? [...permissionState.addedScopeTypes, 'EXPLICIT_USERS' as PermissionOverrideScope]
                      : permissionState.addedScopeTypes;
                    const removedScopeTypes = permissionState.removedScopeTypes;
                    return (
                      <label
                        key={permission.code}
                        className={cn(
                          'group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all duration-300',
                          checked
                            ? 'border-primary/20 bg-primary/[0.03] shadow-[0_2px_10px_-4px_rgba(var(--primary),0.05)] hover:border-primary/30'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">{permission.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono line-clamp-1">{permission.code}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                            <Checkbox
                              checked={checked}
                              disabled={
                                loading
                                || (
                                  checked
                                    ? (
                                      (needsRevokeToDisable && !canRevokeOverride)
                                      || (needsCreateToDisable && !canCreateOverride)
                                    )
                                    : (
                                      (needsRevokeToEnable && !canRevokeOverride)
                                      || (needsCreateToEnable && !canCreateOverride)
                                    )
                                )
                              }
                              onCheckedChange={(value) => handlePermissionToggle(permission.code, value === true)}
                              className={cn('transition-all duration-300 rounded', checked ? 'scale-110' : '')}
                            />
                          </div>
                        </div>

                        {(permissionState.fromTemplate || permissionState.allowOverrides.length > 0 || permissionState.denyOverrides.length > 0) && (
                          <div className="mt-auto space-y-2 border-t border-slate-100/60 pt-2">
                            <p className="text-[11px] font-medium leading-5 text-slate-500">
                              生效范围: {formatScopeSummaryWithDedup(effectiveScopeTypes, permissionState.effectiveExplicitUserIds)}
                            </p>

                            <div className="flex flex-wrap gap-1.5 shrink-0">
                              {permissionState.fromTemplate && (
                                <Badge
                                  variant="outline"
                                  className="rounded-md bg-slate-100/50 border-transparent text-slate-500 font-bold px-1.5 py-0 text-[10px]"
                                >
                                  角色默认
                                </Badge>
                              )}
                              {addedScopeTypes.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="rounded-md bg-emerald-50/50 border-emerald-200/50 text-emerald-600 font-bold px-1.5 py-0 text-[10px] normal-case tracking-normal shrink-0 max-w-[160px] truncate"
                                >
                                  新增范围: {formatScopeSummaryWithDedup(addedScopeTypes, permissionState.effectiveExplicitUserIds)}
                                </Badge>
                              )}
                              {removedScopeTypes.length > 0 && (
                                <Badge
                                  variant="warning"
                                  className="rounded-md bg-red-50/50 border-red-200/50 text-red-600 font-bold px-1.5 py-0 text-[10px] normal-case tracking-normal shadow-none shrink-0 max-w-[160px] truncate"
                                >
                                  已移除: {formatScopeSummaryWithDedup(removedScopeTypes)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {isLoadingUserOverrides && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl">
              <div className="bg-white border border-slate-100 shadow-xl px-6 py-4 rounded-full flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="text-sm font-bold text-slate-700">正在同步当前权限状态...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
