/* eslint-disable react-hooks/set-state-in-effect */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { PermissionOverrideScope, RoleCode, UserPermissionOverride } from '@/types/api';
import type { Department, UserList, UserList as UserDetail } from '@/types/common';

import {
  formatScopeSummary,
  normalizeScopeTypes,
  sameScopeTypes,
  sameScopeUserIds,
} from './user-form.utils';
import { normalizeScopeUserIds } from './user-permission-section.helpers';
import type { ScopeFilterOption } from './user-permission-section.types';

interface RoleScopeSelection {
  scopeTypes: PermissionOverrideScope[];
  scopeUserIds: number[];
}

interface UseUserPermissionScopeStateParams {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  departmentId?: number;
  selectedDepartmentName?: string;
  hasConfigurablePermissionRoles: boolean;
  normalizedSelectedPermissionRole: RoleCode;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  shouldLoadUserOverrides: boolean;
  isLoadingUserOverrides: boolean;
  scopeUsers: UserList[];
  effectiveDraftOverrides: UserPermissionOverride[];
  initialDraftOverrides: UserPermissionOverride[];
  isDraftOverridesActive: boolean;
  selectedPermissionScopes: PermissionOverrideScope[];
  setSelectedPermissionScopes: Dispatch<SetStateAction<PermissionOverrideScope[]>>;
  selectedScopeUserIds: number[];
  setSelectedScopeUserIds: Dispatch<SetStateAction<number[]>>;
}

interface UseUserPermissionScopeStateResult {
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  scopeUserSearch: string;
  showScopeAdjustPanel: boolean;
  scopeUserFilter: string;
  scopeFilterOptions: ScopeFilterOption[];
  filteredScopeUsers: UserList[];
  selectedFilteredScopeCount: number;
  isAllFilteredScopeUsersSelected: boolean;
  hasPartialFilteredScopeSelection: boolean;
  setShowScopeAdjustPanel: (open: boolean) => void;
  setScopeUserSearch: (value: string) => void;
  setScopeUserFilter: (value: string) => void;
  formatScopeSummaryForDisplay: (
    scopeTypes: PermissionOverrideScope[],
    scopeUserIds?: number[],
  ) => string;
  handleScopeFilterChange: (filterValue: string) => void;
  handleFilterDoubleClick: (filterValue: string) => void;
  toggleSelectAllFilteredScopeUsers: () => void;
  applyDefaultScopePreset: () => void;
  toggleScopeUser: (scopeUserId: number) => void;
  ensureExplicitUsersScopeSelected: () => void;
}

export const useUserPermissionScopeState = ({
  userId,
  userDetail,
  departments,
  departmentId,
  selectedDepartmentName,
  hasConfigurablePermissionRoles,
  normalizedSelectedPermissionRole,
  selectedRoleDefaultScopeTypes,
  shouldLoadUserOverrides,
  isLoadingUserOverrides,
  scopeUsers,
  effectiveDraftOverrides,
  initialDraftOverrides,
  isDraftOverridesActive,
  selectedPermissionScopes,
  setSelectedPermissionScopes,
  selectedScopeUserIds,
  setSelectedScopeUserIds,
}: UseUserPermissionScopeStateParams): UseUserPermissionScopeStateResult => {
  const scopeSelectionByRoleRef = useRef<Partial<Record<RoleCode, RoleScopeSelection>>>({});
  const lastAppliedRoleSelectionRef = useRef<RoleCode | null>(null);
  const [scopeUserSearch, setScopeUserSearch] = useState('');
  const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
  const [scopeUserFilter, setScopeUserFilterState] = useState<string>('all');

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
    if (isDraftOverridesActive) {
      return;
    }
    scopeSelectionByRoleRef.current = {};
    lastAppliedRoleSelectionRef.current = null;
  }, [initialDraftOverrides, isDraftOverridesActive]);

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

    const fallbackSelection = getRoleScopeSelectionFromOverrides(roleCode);
    const fallbackScopeTypes = fallbackSelection?.scopeTypes ?? selectedRoleDefaultScopeTypes;
    const fallbackScopeUserIds = normalizeScopeUserIds(
      fallbackSelection?.scopeUserIds
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
        setScopeUserFilterState((prev) => (prev !== 'all' ? 'all' : prev));
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
    setScopeUserFilterState((prev) => (prev !== 'all' ? 'all' : prev));
  }, [
    effectiveDraftOverrides.length,
    getPresetMatchedScopeUserIds,
    getRoleScopeSelectionFromOverrides,
    hasConfigurablePermissionRoles,
    isLoadingUserOverrides,
    normalizedSelectedPermissionRole,
    setSelectedPermissionScopes,
    setSelectedScopeUserIds,
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
    const normalizedScopeUserIds = normalizeScopeUserIds(scopeUserIds);
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

  const setScopeUserFilter = (value: string) => {
    setScopeUserFilterState(value);
  };

  const handleScopeFilterChange = (filterValue: string) => {
    setScopeUserFilterState((prev) => (prev === filterValue ? 'all' : filterValue));
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

  const handleFilterDoubleClick = (filterValue: string) => {
    const ownerUserId = userId ?? userDetail?.id ?? null;
    const targetUserIds = scopeUsers
      .filter((scopeUser) => {
        if (filterValue === 'mentees') {
          return ownerUserId != null && scopeUser.mentor?.id === ownerUserId;
        }
        if (filterValue !== 'all') {
          const deptId = Number(filterValue.replace('dept_', ''));
          return scopeUser.department?.id === deptId;
        }
        return true;
      })
      .map((scopeUser) => scopeUser.id);

    if (targetUserIds.length === 0) return;

    setScopeUserFilterState(filterValue);

    setSelectedScopeUserIds((prev) => {
      const nextUserIdSet = new Set(prev);
      const shouldUnselectAll = targetUserIds.every((id) => nextUserIdSet.has(id));

      if (shouldUnselectAll) {
        targetUserIds.forEach((id) => nextUserIdSet.delete(id));
      } else {
        targetUserIds.forEach((id) => nextUserIdSet.add(id));
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

  return {
    selectedPermissionScopes,
    selectedScopeUserIds,
    selectedRoleDefaultScopeTypes,
    scopeUserSearch,
    showScopeAdjustPanel,
    scopeUserFilter,
    scopeFilterOptions,
    filteredScopeUsers,
    selectedFilteredScopeCount,
    isAllFilteredScopeUsersSelected,
    hasPartialFilteredScopeSelection,
    setShowScopeAdjustPanel,
    setScopeUserSearch,
    setScopeUserFilter,
    formatScopeSummaryForDisplay,
    handleScopeFilterChange,
    handleFilterDoubleClick,
    toggleSelectAllFilteredScopeUsers,
    applyDefaultScopePreset,
    toggleScopeUser,
    ensureExplicitUsersScopeSelected,
  };
};
