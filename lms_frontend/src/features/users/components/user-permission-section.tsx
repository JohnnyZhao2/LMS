import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useCreateUserPermissionOverride,
  usePermissionCatalog,
  useRevokeUserPermissionOverride,
  useRolePermissionTemplates,
  useUserPermissionOverrides,
} from '@/features/authorization/api/authorization';
import type {
  CreateUserPermissionOverrideRequest,
  PermissionOverrideEffect,
  PermissionOverrideScope,
  UserPermissionOverride,
  RoleCode,
} from '@/types/api';
import type { Department, Role, UserList, UserList as UserDetail } from '@/types/common';

import { useUsers } from '../api/get-users';
import { UserPermissionCard } from './user-permission-card';
import { UserPermissionModuleSidebar } from './user-permission-module-sidebar';
import { UserPermissionScopePopover } from './user-permission-scope-popover';
import {
  DEFAULT_ROLE_SCOPE_TYPES,
  PERMISSION_SCOPE_ORDER,
  formatScopeSummary,
  normalizeScopeTypes,
  sameScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';
import type { PermissionState, ScopeFilterOption } from './user-permission-section.types';

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

interface RoleScopeSelection {
  scopeTypes: PermissionOverrideScope[];
  scopeUserIds: number[];
}

export interface UserPermissionSectionHandle {
  hasPendingChanges: () => boolean;
  submitChanges: () => Promise<void>;
}

interface OverrideSignatureParts {
  permissionCode: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
  scopeType: PermissionOverrideScope;
  scopeUserIds: number[];
}

const buildOverrideSignature = ({
  permissionCode,
  effect,
  appliesToRole,
  scopeType,
  scopeUserIds,
}: OverrideSignatureParts): string => [
  permissionCode,
  effect,
  appliesToRole ?? 'ALL_ROLES',
  scopeType,
  normalizeScopeUserIds(scopeUserIds).join(','),
].join('|');

const normalizeScopeUserIds = (scopeUserIds: number[]): number[] => (
  Array.from(new Set(scopeUserIds)).sort((left, right) => left - right)
);

const getOverrideSignature = (override: Pick<
UserPermissionOverride,
'permission_code' | 'effect' | 'applies_to_role' | 'scope_type' | 'scope_user_ids'
>): string => buildOverrideSignature({
  permissionCode: override.permission_code,
  effect: override.effect,
  appliesToRole: override.applies_to_role,
  scopeType: override.scope_type,
  scopeUserIds: override.scope_user_ids,
});

export const UserPermissionSection = forwardRef<UserPermissionSectionHandle, UserPermissionSectionProps>(({
  userId,
  userDetail,
  roles,
  departments,
  selectedRoleCodes,
  departmentId,
  isSuperuserAccount,
  dialogContentElement,
}, ref) => {
  const { hasPermission, refreshUser } = useAuth();
  const canManageUserAuthorization = hasPermission('user.authorize');
  const canViewOverride = canManageUserAuthorization;
  const canCreateOverride = canManageUserAuthorization;
  const canRevokeOverride = canManageUserAuthorization;
  const canViewRoleTemplate =
    hasPermission('authorization.role_template.view')
    || hasPermission('authorization.role_template.update');
  const shouldLoadUserOverrides = Boolean(userId) && canViewOverride;

  const { data: permissionCatalog = [] } = usePermissionCatalog(undefined, shouldLoadUserOverrides);
  const {
    data: userOverrides = [],
    isLoading: isLoadingUserOverrides,
    refetch: refetchUserOverrides,
  } = useUserPermissionOverrides(
    userId ?? null,
    false,
    shouldLoadUserOverrides,
  );
  const createUserOverride = useCreateUserPermissionOverride();
  const revokeUserOverride = useRevokeUserPermissionOverride();
  const [selectedPermissionModule, setSelectedPermissionModule] = useState('');
  const [selectedPermissionRole, setSelectedPermissionRole] = useState<RoleCode>('MENTOR');
  const [selectedPermissionScopes, setSelectedPermissionScopes] = useState<PermissionOverrideScope[]>([]);
  const [selectedScopeUserIds, setSelectedScopeUserIds] = useState<number[]>([]);
  const scopeSelectionByRoleRef = useRef<Partial<Record<RoleCode, RoleScopeSelection>>>({});
  const lastAppliedRoleSelectionRef = useRef<RoleCode | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<UserPermissionOverride[] | null>(null);
  const nextDraftOverrideIdRef = useRef(-1);
  const [scopeUserSearch, setScopeUserSearch] = useState('');
  const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
  const [scopeUserFilter, setScopeUserFilter] = useState<string>('all');

  const { data: scopeUsers = [], isLoading: isScopeUsersLoading } = useUsers(
    {},
    { enabled: shouldLoadUserOverrides },
  );

  const roleNameMap = useMemo(() => {
    const nameMap = new Map<string, string>();
    roles.forEach((role) => {
      nameMap.set(role.code, role.name);
    });
    if (!nameMap.has('SUPER_ADMIN')) {
      nameMap.set('SUPER_ADMIN', '超级管理员');
    }
    return nameMap;
  }, [roles]);

  const previewRoleCodes = useMemo<RoleCode[]>(() => {
    if (isSuperuserAccount) {
      return ['SUPER_ADMIN'];
    }
    return Array.from(new Set(
      selectedRoleCodes.filter((roleCode) => roleCode !== 'STUDENT' && roleCode !== 'SUPER_ADMIN'),
    ));
  }, [selectedRoleCodes, isSuperuserAccount]);
  const hasConfigurablePermissionRoles = previewRoleCodes.length > 0;

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
    return previewRoleCodes[0] ?? (isSuperuserAccount ? 'SUPER_ADMIN' : 'MENTOR');
  }, [isSuperuserAccount, selectedPermissionRole, previewRoleCodes]);

  const selectedRoleDefaultScopeTypes = useMemo(
    () => normalizeScopeTypes(
      roleTemplateDefaultScopeMap.get(normalizedSelectedPermissionRole)
        ?? DEFAULT_ROLE_SCOPE_TYPES[normalizedSelectedPermissionRole]
        ?? [],
    ),
    [normalizedSelectedPermissionRole, roleTemplateDefaultScopeMap],
  );
  const selectedDepartmentName = useMemo(() => (
    departments.find((department) => (
      department.id === (departmentId ?? userDetail?.department?.id)
    ))?.name ?? userDetail?.department?.name
  ), [departments, departmentId, userDetail?.department?.id, userDetail?.department?.name]);

  const permissionModules = useMemo(
    () => Array.from(new Set(permissionCatalog.map((item) => item.module).filter(Boolean))),
    [permissionCatalog],
  );
  const permissionNameMap = useMemo(() => {
    const nameMap = new Map<string, string>();
    permissionCatalog.forEach((permission) => {
      nameMap.set(permission.code, permission.name);
    });
    return nameMap;
  }, [permissionCatalog]);
  const initialDraftOverrides = useMemo<UserPermissionOverride[]>(() => {
    if (!shouldLoadUserOverrides) {
      return [];
    }
    return userOverrides
      .filter((override) => override.is_active && override.applies_to_role !== 'STUDENT')
      .map((override) => ({
        ...override,
        scope_user_ids: normalizeScopeUserIds(override.scope_user_ids),
      }));
  }, [shouldLoadUserOverrides, userOverrides]);
  const effectiveDraftOverrides = draftOverrides ?? initialDraftOverrides;

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
    () => effectiveDraftOverrides.filter((override) => (
      override.is_active && override.applies_to_role === normalizedSelectedPermissionRole
    )),
    [effectiveDraftOverrides, normalizedSelectedPermissionRole],
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

  const getPermissionTemplateCount = (roleCode: RoleCode) =>
    (roleTemplatePermissionCodeMap.get(roleCode) ?? []).length;

  const getPresetMatchedScopeUserIds = useCallback((scopeTypes: PermissionOverrideScope[]): number[] => {
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

    return normalizeScopeUserIds(Array.from(matchedUserIds));
  }, [
    departmentId,
    scopeUsers,
    userDetail?.department?.id,
    userDetail?.id,
    userId,
  ]);

  useEffect(() => {
    if (draftOverrides !== null) {
      return;
    }
    scopeSelectionByRoleRef.current = {};
    lastAppliedRoleSelectionRef.current = null;
  }, [draftOverrides, initialDraftOverrides]);

  const getRoleScopeSelectionFromOverrides = useCallback((roleCode: RoleCode): RoleScopeSelection | null => {
    const scopedOverrides = effectiveDraftOverrides.filter((override) => (
      override.is_active && override.applies_to_role === roleCode
    ));
    if (scopedOverrides.length === 0) {
      return null;
    }

    const scopedAllowOverrides = scopedOverrides.filter((override) => override.effect === 'ALLOW');
    const sourceOverrides = scopedAllowOverrides.length > 0 ? scopedAllowOverrides : scopedOverrides;

    const standardScopeTypes = normalizeScopeTypes(
      sourceOverrides
        .map((override) => override.scope_type)
        .filter((scopeType): scopeType is Exclude<PermissionOverrideScope, 'EXPLICIT_USERS' | 'SELF'> => (
          scopeType !== 'EXPLICIT_USERS' && scopeType !== 'SELF'
        )),
    );
    const explicitOverride = sourceOverrides.find((override) => (
      override.scope_type === 'EXPLICIT_USERS' && override.scope_user_ids.length > 0
    ));
    const explicitScopeUserIds = normalizeScopeUserIds(explicitOverride?.scope_user_ids ?? []);
    const scopeTypes = normalizeScopeTypes([
      ...standardScopeTypes,
      ...(explicitScopeUserIds.length > 0 ? ['EXPLICIT_USERS' as const] : []),
    ]);

    if (scopeTypes.length === 0 && explicitScopeUserIds.length === 0) {
      return { scopeTypes: [], scopeUserIds: [] };
    }

    return {
      scopeTypes,
      scopeUserIds: explicitScopeUserIds.length > 0
        ? explicitScopeUserIds
        : getPresetMatchedScopeUserIds(scopeTypes),
    };
  }, [effectiveDraftOverrides, getPresetMatchedScopeUserIds]);

  useEffect(() => {
    if (!hasConfigurablePermissionRoles) {
      setSelectedPermissionScopes((prev) => (prev.length > 0 ? [] : prev));
      setSelectedScopeUserIds((prev) => (prev.length > 0 ? [] : prev));
      lastAppliedRoleSelectionRef.current = null;
      return;
    }

    if (shouldLoadUserOverrides && isLoadingUserOverrides && effectiveDraftOverrides.length === 0) {
      return;
    }

    const roleCode = normalizedSelectedPermissionRole;
    const cachedSelection = scopeSelectionByRoleRef.current[roleCode];

    const fallbackScopeTypes = getRoleScopeSelectionFromOverrides(roleCode)?.scopeTypes ?? selectedRoleDefaultScopeTypes;
    const fallbackScopeUserIds = normalizeScopeUserIds(
      getRoleScopeSelectionFromOverrides(roleCode)?.scopeUserIds
      ?? getPresetMatchedScopeUserIds(fallbackScopeTypes),
    );
    const resolvedSelection = cachedSelection ?? {
      scopeTypes: fallbackScopeTypes,
      scopeUserIds: fallbackScopeUserIds,
    };

    if (cachedSelection) {
      if (lastAppliedRoleSelectionRef.current !== roleCode) {
        setSelectedPermissionScopes((prev) => (
          sameScopeTypes(prev, cachedSelection.scopeTypes) ? prev : cachedSelection.scopeTypes
        ));
        setSelectedScopeUserIds((prev) => (
          sameScopeUserIds(prev, cachedSelection.scopeUserIds) ? prev : cachedSelection.scopeUserIds
        ));
        setScopeUserSearch((prev) => (prev ? '' : prev));
        setShowScopeAdjustPanel((prev) => (prev ? false : prev));
        setScopeUserFilter((prev) => (prev !== 'all' ? 'all' : prev));
      }
      lastAppliedRoleSelectionRef.current = roleCode;
      return;
    }

    setSelectedPermissionScopes((prev) => (
      sameScopeTypes(prev, resolvedSelection.scopeTypes) ? prev : resolvedSelection.scopeTypes
    ));
    setSelectedScopeUserIds((prev) => (
      sameScopeUserIds(prev, resolvedSelection.scopeUserIds) ? prev : resolvedSelection.scopeUserIds
    ));
    scopeSelectionByRoleRef.current[roleCode] = resolvedSelection;
    lastAppliedRoleSelectionRef.current = roleCode;
    setScopeUserSearch((prev) => (prev ? '' : prev));
    setShowScopeAdjustPanel((prev) => (prev ? false : prev));
    setScopeUserFilter((prev) => (prev !== 'all' ? 'all' : prev));
  }, [
    effectiveDraftOverrides.length,
    getPresetMatchedScopeUserIds,
    getRoleScopeSelectionFromOverrides,
    hasConfigurablePermissionRoles,
    isLoadingUserOverrides,
    normalizedSelectedPermissionRole,
    selectedRoleDefaultScopeTypes,
    shouldLoadUserOverrides,
  ]);

  useEffect(() => {
    if (!hasConfigurablePermissionRoles) {
      return;
    }
    const roleCode = normalizedSelectedPermissionRole;
    const normalizedScopeTypes = normalizeScopeTypes(selectedPermissionScopes);
    const normalizedScopeUserIds = normalizeScopeUserIds(selectedScopeUserIds);

    scopeSelectionByRoleRef.current[roleCode] = {
      scopeTypes: normalizedScopeTypes,
      scopeUserIds: normalizedScopeUserIds,
    };
  }, [hasConfigurablePermissionRoles, normalizedSelectedPermissionRole, selectedPermissionScopes, selectedScopeUserIds]);

  const applyScopePresetWithAutoSelection = (scopeTypes: PermissionOverrideScope[]) => {
    const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
    const matchedScopeUserIds = normalizeScopeUserIds(getPresetMatchedScopeUserIds(normalizedScopeTypes));
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
  const formatScopeSummaryForDisplay = (
    scopeTypes: PermissionOverrideScope[],
    scopeUserIds: number[] = [],
  ): string => {
    const normalizedScopeTypes = normalizeScopeTypes(scopeTypes);
    const normalizedScopeUserIds = Array.from(new Set(scopeUserIds)).sort((left, right) => left - right);
    const allScopeUserIds = scopeUsers.map((scopeUser) => scopeUser.id);
    const resolveExplicitUsersAlias = (): string | null => {
      if (normalizedScopeUserIds.length === 0) {
        return null;
      }

      for (const department of departments) {
        const departmentUserIds = scopeUsers
          .filter((scopeUser) => scopeUser.department?.id === department.id)
          .map((scopeUser) => scopeUser.id);
        if (departmentUserIds.length > 0 && sameScopeUserIds(normalizedScopeUserIds, departmentUserIds)) {
          return department.name;
        }
      }
      if (allScopeUserIds.length > 0 && sameScopeUserIds(normalizedScopeUserIds, allScopeUserIds)) {
        return '全部';
      }
      return null;
    };
    if (normalizedScopeTypes.length === 1) {
      if (normalizedScopeTypes[0] === 'ALL') {
        return '全部';
      }
      if (normalizedScopeTypes[0] === 'DEPARTMENT' && selectedDepartmentName) {
        return selectedDepartmentName;
      }
      if (normalizedScopeTypes[0] === 'EXPLICIT_USERS') {
        const explicitUsersAlias = resolveExplicitUsersAlias();
        if (explicitUsersAlias) {
          return explicitUsersAlias;
        }
      }
    }

    const summary = formatScopeSummaryWithDedup(normalizedScopeTypes, normalizedScopeUserIds);
    return summary
      .replaceAll('全部对象', '全部')
      .replaceAll('同部门', selectedDepartmentName ?? '同部门');
  };

  const scopeFilterOptions = useMemo<ScopeFilterOption[]>(() => {
    const options: ScopeFilterOption[] = [
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

  const filteredScopeUsers = useMemo<UserList[]>(() => {
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

  const getPermissionState = (permissionCode: string): PermissionState => {
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

  const ensureExplicitUsersScopeSelected = () => {
    if (!selectedPermissionScopes.includes('EXPLICIT_USERS')) {
      setSelectedPermissionScopes((prev) => normalizeScopeTypes([...prev, 'EXPLICIT_USERS']));
    }
  };

  const appendDraftOverrides = (
    currentOverrides: UserPermissionOverride[],
    payloads: CreateUserPermissionOverrideRequest[],
  ): UserPermissionOverride[] => {
    const nextOverrides = [...currentOverrides];
    const existingSignatureSet = new Set(nextOverrides.map(getOverrideSignature));

    payloads.forEach((payload) => {
      const signature = buildOverrideSignature({
        permissionCode: payload.permission_code,
        effect: payload.effect,
        appliesToRole: payload.applies_to_role ?? null,
        scopeType: payload.scope_type,
        scopeUserIds: payload.scope_user_ids ?? [],
      });
      if (existingSignatureSet.has(signature)) {
        return;
      }
      const now = new Date().toISOString();
      nextOverrides.push({
        id: nextDraftOverrideIdRef.current,
        permission_code: payload.permission_code,
        permission_name: permissionNameMap.get(payload.permission_code) ?? payload.permission_code,
        effect: payload.effect,
        applies_to_role: payload.applies_to_role ?? null,
        scope_type: payload.scope_type,
        scope_user_ids: normalizeScopeUserIds(payload.scope_user_ids ?? []),
        reason: payload.reason ?? '',
        expires_at: payload.expires_at ?? null,
        is_active: true,
        granted_by_name: null,
        revoked_by_name: null,
        revoked_at: null,
        revoked_reason: '',
        created_at: now,
        updated_at: now,
      });
      existingSignatureSet.add(signature);
      nextDraftOverrideIdRef.current -= 1;
    });

    return nextOverrides;
  };

  const handlePermissionToggle = (permissionCode: string, nextChecked: boolean) => {
    if (!userId) return;
    if (!hasConfigurablePermissionRoles) {
      toast.error('请先分配管理角色，再配置用户权限');
      return;
    }

    if (selectedPermissionScopes.length === 0) {
      toast.error('请先选择扩展范围');
      return;
    }

    if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length === 0) {
      toast.error('请选择至少一个指定用户');
      return;
    }

    const scopeRole = normalizedSelectedPermissionRole;
    const {
      checked: currentChecked,
      fromTemplate,
      allowOverrides,
      denyOverrides,
      selectedAllowOverrides,
      selectedDenyOverrides,
      inheritedSelectedScopeTypes,
      isSelfOnlySelection,
      hasSelfAllow,
      hasNonSelfAllow,
      hasExactExplicitAllow,
      missingSelectedAllowScopeTypes,
    } = getPermissionState(permissionCode);
    const staleExplicitOverrides = [...allowOverrides, ...denyOverrides].filter((override) => (
      override.scope_type === 'EXPLICIT_USERS'
      && (
        !selectedPermissionScopes.includes('EXPLICIT_USERS')
        || !sameScopeUserIds(override.scope_user_ids, selectedScopeUserIds)
      )
    ));
    const needsRevokeStaleExplicitWhenEnable = staleExplicitOverrides.length > 0;

    if (currentChecked === nextChecked) return;

    const needsCreateWhenEnable = missingSelectedAllowScopeTypes.length > 0
      || (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow);
    const needsCreateWhenDisable = fromTemplate && inheritedSelectedScopeTypes.length > 0;
    const needsRevokeWhenEnable = selectedDenyOverrides.length > 0;
    const needsRevokeWhenDisable = selectedAllowOverrides.length > 0;

    if (nextChecked && needsRevokeWhenEnable && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法启用该权限');
      return;
    }
    if (nextChecked && needsRevokeStaleExplicitWhenEnable && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法启用该权限');
      return;
    }
    if (nextChecked && needsCreateWhenEnable && !canCreateOverride) {
      toast.error('当前账号没有创建权限，无法启用该权限');
      return;
    }
    if (!nextChecked && needsRevokeWhenDisable && !canRevokeOverride) {
      toast.error('当前账号没有撤销权限，无法禁用该权限');
      return;
    }
    if (!nextChecked && needsCreateWhenDisable && !canCreateOverride) {
      toast.error('当前账号没有创建权限，无法禁用该权限');
      return;
    }

    const overrideSignaturesToRemove = new Set<string>();
    const payloadsToAdd: CreateUserPermissionOverrideRequest[] = [];

    if (isSelfOnlySelection) {
      if (nextChecked) {
        selectedDenyOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
        if (!fromTemplate && !hasSelfAllow && !hasNonSelfAllow) {
          payloadsToAdd.push({
            permission_code: permissionCode,
            effect: 'ALLOW',
            applies_to_role: scopeRole,
            scope_type: 'SELF',
            scope_user_ids: [],
          });
        }
      } else {
        selectedAllowOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
        if (fromTemplate || hasNonSelfAllow) {
          payloadsToAdd.push({
            permission_code: permissionCode,
            effect: 'DENY',
            applies_to_role: scopeRole,
            scope_type: 'SELF',
            scope_user_ids: [],
          });
        }
      }
    } else if (nextChecked) {
      selectedDenyOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
      staleExplicitOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
      missingSelectedAllowScopeTypes.forEach((scopeType) => {
        payloadsToAdd.push({
          permission_code: permissionCode,
          effect: 'ALLOW',
          applies_to_role: scopeRole,
          scope_type: scopeType,
          scope_user_ids: [],
        });
      });
      if (selectedPermissionScopes.includes('EXPLICIT_USERS') && selectedScopeUserIds.length > 0 && !hasExactExplicitAllow) {
        payloadsToAdd.push({
          permission_code: permissionCode,
          effect: 'ALLOW',
          applies_to_role: scopeRole,
          scope_type: 'EXPLICIT_USERS',
          scope_user_ids: normalizeScopeUserIds(selectedScopeUserIds),
        });
      }
    } else {
      selectedAllowOverrides.forEach((override) => overrideSignaturesToRemove.add(getOverrideSignature(override)));
      inheritedSelectedScopeTypes.forEach((scopeType) => {
        payloadsToAdd.push({
          permission_code: permissionCode,
          effect: 'DENY',
          applies_to_role: scopeRole,
          scope_type: scopeType,
          scope_user_ids: [],
        });
      });
    }

    setDraftOverrides((prev) => {
      const baseOverrides = prev ?? initialDraftOverrides;
      const afterRemove = baseOverrides.filter((override) => !overrideSignaturesToRemove.has(getOverrideSignature(override)));
      return appendDraftOverrides(afterRemove, payloadsToAdd);
    });
  };

  const hasDraftChanges = useMemo(() => {
    const initialSignatureSet = new Set(initialDraftOverrides.map(getOverrideSignature));
    const draftSignatureSet = new Set(effectiveDraftOverrides.map(getOverrideSignature));
    if (initialSignatureSet.size !== draftSignatureSet.size) {
      return true;
    }
    return Array.from(initialSignatureSet).some((signature) => !draftSignatureSet.has(signature));
  }, [effectiveDraftOverrides, initialDraftOverrides]);

  useImperativeHandle(ref, () => ({
    hasPendingChanges: () => hasDraftChanges,
    submitChanges: async () => {
      if (!userId || !hasDraftChanges) {
        return;
      }

      const initialBySignature = new Map(initialDraftOverrides.map((override) => [getOverrideSignature(override), override]));
      const draftBySignature = new Map(effectiveDraftOverrides.map((override) => [getOverrideSignature(override), override]));

      const overridesToRevoke = Array.from(initialBySignature.entries())
        .filter(([signature]) => !draftBySignature.has(signature))
        .map(([, override]) => override)
        .filter((override) => override.id > 0);
      const overridesToCreate = Array.from(draftBySignature.entries())
        .filter(([signature]) => !initialBySignature.has(signature))
        .map(([, override]) => override);

      if (overridesToRevoke.length > 0 && !canRevokeOverride) {
        toast.error('当前账号没有撤销权限，无法提交权限草稿');
        throw new Error('missing revoke permission');
      }
      if (overridesToCreate.length > 0 && !canCreateOverride) {
        toast.error('当前账号没有创建权限，无法提交权限草稿');
        throw new Error('missing create permission');
      }

      await Promise.all(
        overridesToRevoke.map((override) =>
          revokeUserOverride.mutateAsync({ userId, overrideId: override.id }),
        ),
      );
      await Promise.all(
        overridesToCreate.map((override) =>
          createUserOverride.mutateAsync({
            userId,
            data: {
              permission_code: override.permission_code,
              effect: override.effect,
              applies_to_role: override.applies_to_role,
              scope_type: override.scope_type,
              scope_user_ids: override.scope_type === 'EXPLICIT_USERS' ? normalizeScopeUserIds(override.scope_user_ids) : [],
              reason: override.reason,
              expires_at: override.expires_at,
            },
          }),
        ),
      );
      await refreshUser();
      await refetchUserOverrides();
      setDraftOverrides(null);
      nextDraftOverrideIdRef.current = -1;
      scopeSelectionByRoleRef.current = {};
    },
  }), [
    canCreateOverride,
    canRevokeOverride,
    createUserOverride,
    effectiveDraftOverrides,
    hasDraftChanges,
    initialDraftOverrides,
    refetchUserOverrides,
    refreshUser,
    revokeUserOverride,
    userId,
  ]);

  const modulePermissionCounts: Record<string, { enabled: number; total: number }> = {};
  permissionModules.forEach((moduleName) => {
    modulePermissionCounts[moduleName] = { enabled: 0, total: 0 };
  });
  permissionCatalog.forEach((permission) => {
    if (!permission.module || !modulePermissionCounts[permission.module]) {
      return;
    }
    modulePermissionCounts[permission.module].total += 1;
    if (getPermissionState(permission.code).checked) {
      modulePermissionCounts[permission.module].enabled += 1;
    }
  });
  const selectedRoleLabel = roleNameMap.get(normalizedSelectedPermissionRole) ?? normalizedSelectedPermissionRole;
  const selectedScopeSummary = formatScopeSummaryForDisplay(selectedPermissionScopes, selectedScopeUserIds);
  const permissionContextSummary = `${selectedRoleLabel}·${selectedScopeSummary}`;

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <KeyRound className="w-4 h-4 text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">用户权限自定义</h3>
        </div>

        {hasConfigurablePermissionRoles ? (
          <div className="flex items-center gap-6 flex-1 justify-end max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">生效角色</span>
              <select
                value={normalizedSelectedPermissionRole}
                onChange={(event) => setSelectedPermissionRole(event.target.value as RoleCode)}
                className="h-9 min-w-[140px] rounded-xl border border-slate-200/70 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all hover:border-primary/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                {overrideRoleOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label} ({getPermissionTemplateCount(item.code)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-[320px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">扩展范围</span>
              <UserPermissionScopePopover
                open={showScopeAdjustPanel}
                onOpenChange={setShowScopeAdjustPanel}
                summary={formatScopeSummaryForDisplay(selectedPermissionScopes, selectedScopeUserIds)}
                scopeFilterOptions={scopeFilterOptions}
                scopeUserFilter={scopeUserFilter}
                onScopeFilterChange={handleScopeFilterChange}
                showReset={!sameScopeTypes(selectedPermissionScopes, selectedRoleDefaultScopeTypes)}
                onReset={() => {
                  applyDefaultScopePreset();
                  setScopeUserFilter('all');
                }}
                scopeUserSearch={scopeUserSearch}
                onScopeUserSearchChange={setScopeUserSearch}
                isAllFilteredScopeUsersSelected={isAllFilteredScopeUsersSelected}
                hasPartialFilteredScopeSelection={hasPartialFilteredScopeSelection}
                onToggleSelectAllFilteredScopeUsers={toggleSelectAllFilteredScopeUsers}
                selectedFilteredScopeCount={selectedFilteredScopeCount}
                filteredScopeUsers={filteredScopeUsers}
                selectedScopeUserIds={selectedScopeUserIds}
                onToggleScopeUser={toggleScopeUser}
                isExplicitUsersScopeSelected={selectedPermissionScopes.includes('EXPLICIT_USERS')}
                onEnsureExplicitUsersScopeSelected={ensureExplicitUsersScopeSelected}
                isScopeUsersLoading={isScopeUsersLoading}
                dialogContentElement={dialogContentElement}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 text-right text-xs font-semibold text-slate-400">
            学员是固定工作台角色，不参与用户赋权生效
          </div>
        )}
      </div>

      {!canViewOverride ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
          您没有“用户权限自定义配置”权限，仅可查看上方默认角色包信息。
        </div>
      ) : !hasConfigurablePermissionRoles ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
          当前账号仅包含学员工作台角色，请先分配导师/室经理/团队经理/管理员角色后再配置用户权限覆盖。
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-8 items-start relative">
          <UserPermissionModuleSidebar
            permissionModules={permissionModules}
            activePermissionModule={activePermissionModule}
            moduleCounts={modulePermissionCounts}
            onSelectModule={setSelectedPermissionModule}
          />

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
                    return (
                      <UserPermissionCard
                        key={permission.code}
                        permission={permission}
                        contextSummary={permissionContextSummary}
                        permissionState={permissionState}
                        loading={false}
                        canCreateOverride={canCreateOverride}
                        canRevokeOverride={canRevokeOverride}
                        hasValidScopeSelection={
                          selectedPermissionScopes.length > 0
                          && (
                            !selectedPermissionScopes.includes('EXPLICIT_USERS')
                            || selectedScopeUserIds.length > 0
                          )
                        }
                        selectedPermissionScopes={selectedPermissionScopes}
                        selectedScopeUserIds={selectedScopeUserIds}
                        onToggle={(nextChecked) => handlePermissionToggle(permission.code, nextChecked)}
                      />
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
});

UserPermissionSection.displayName = 'UserPermissionSection';
