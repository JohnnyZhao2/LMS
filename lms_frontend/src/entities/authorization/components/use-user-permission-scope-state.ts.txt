import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import type { PermissionOverrideScope } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import type { Department, UserList, UserList as UserDetail } from '@/types/common';

import { normalizeScopeTypes, sameScopeTypes, sameScopeUserIds } from './user-form.utils';
import type { ScopeFilterOption } from './user-permission-section.types';
import {
  formatScopeSummaryForDisplay as formatScopeSummaryForDisplayValue,
  getPresetMatchedScopeUserIds,
  getSelectableScopeUsers,
  normalizeAvailableScopeTypes,
  resolveRoleScopeSelection,
  STUDENT_ONLY_SCOPE_PERMISSION_CODES,
  syncRoleScopeSelection,
} from './user-permission-scope.utils';
import type { RoleScopeSelection } from './user-permission-scope.utils';
import type { ScopeGroupOverrideEntry } from './user-permission-section.types';

interface UseUserPermissionScopeStateParams {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  departmentId?: number;
  selectedDepartmentName?: string;
  hasConfigurablePermissionRoles: boolean;
  normalizedSelectedPermissionRole: RoleCode;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  availableScopeTypes: PermissionOverrideScope[];
  scopeGroupKey?: string;
  scopePermissionCode?: string | null;
  scopeUsers: UserList[];
  scopeGroupOverrides: ScopeGroupOverrideEntry[];
  onSelectionChange?: (selection: RoleScopeSelection) => void | Promise<void>;
}

interface UseUserPermissionScopeStateResult {
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
  scopeUserSearch: string;
  showScopeAdjustPanel: boolean;
  scopeUserFilter: string;
  scopeFilterOptions: ScopeFilterOption[];
  filteredScopeUsers: UserList[];
  selectedFilteredScopeCount: number;
  isAllFilteredScopeUsersSelected: boolean;
  hasPartialFilteredScopeSelection: boolean;
  availableScopeTypes: PermissionOverrideScope[];
  setShowScopeAdjustPanel: (open: boolean) => void;
  setScopeUserSearch: (value: string) => void;
  setScopeUserFilter: (value: string) => void;
  formatScopeSummaryForDisplay: (
    scopeTypes: PermissionOverrideScope[],
    scopeUserIds?: number[],
  ) => string;
  handleScopeFilterChange: (filterValue: string) => void;
  toggleSelectAllFilteredScopeUsers: () => void;
  applyDefaultScopePreset: () => void;
  selectPresetScope: (scopeType: PermissionOverrideScope) => void;
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
  availableScopeTypes,
  scopeGroupKey,
  scopePermissionCode,
  scopeUsers,
  scopeGroupOverrides,
  onSelectionChange,
}: UseUserPermissionScopeStateParams): UseUserPermissionScopeStateResult => {
  const [scopeSelectionsByKey, setScopeSelectionsByKey] = useState<Record<string, RoleScopeSelection>>({});
  const [scopeUserSearch, setScopeUserSearch] = useState('');
  const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
  const [scopeUserFilter, setScopeUserFilter] = useState<string>('all');
  const normalizedAvailableScopeTypes = useMemo(
    () => normalizeAvailableScopeTypes(availableScopeTypes),
    [availableScopeTypes],
  );
  const canSelectExplicitScopeUsers = normalizedAvailableScopeTypes.includes('EXPLICIT_USERS');
  const shouldRestrictToStudents = useMemo(
    () => Boolean(scopePermissionCode && STUDENT_ONLY_SCOPE_PERMISSION_CODES.has(scopePermissionCode)),
    [scopePermissionCode],
  );
  const ownerUserId = userId ?? userDetail?.id ?? null;
  const ownerDepartmentId = departmentId ?? userDetail?.department?.id ?? null;
  const selectableScopeUsers = useMemo(
    () => getSelectableScopeUsers(scopeUsers, shouldRestrictToStudents),
    [scopeUsers, shouldRestrictToStudents],
  );
  const selectableScopeUserIdSet = useMemo(
    () => new Set(selectableScopeUsers.map((scopeUser) => scopeUser.id)),
    [selectableScopeUsers],
  );
  const selectionStateKey = useMemo(
    () => `${ownerUserId ?? 'new'}:${normalizedSelectedPermissionRole}:${scopeGroupKey ?? 'none'}`,
    [normalizedSelectedPermissionRole, ownerUserId, scopeGroupKey],
  );
  const getPresetMatchedScopeUserIdsForSelection = useCallback(
    (scopeTypes: PermissionOverrideScope[]) => getPresetMatchedScopeUserIds({
      departmentId: ownerDepartmentId,
      scopeTypes,
      selectableScopeUsers,
      userId: ownerUserId,
    }),
    [ownerDepartmentId, ownerUserId, selectableScopeUsers],
  );

  const currentRoleSelection = useMemo(() => {
    if (!hasConfigurablePermissionRoles) {
      return {
        scopeTypes: [],
        scopeUserIds: [],
      };
    }

    return resolveRoleScopeSelection({
      cachedSelection: scopeSelectionsByKey[selectionStateKey],
      getPresetMatchedScopeUserIdsForSelection,
      scopeGroupKey,
      roleCode: normalizedSelectedPermissionRole,
      selectableScopeUserIdSet,
      selectedRoleDefaultScopeTypes,
      scopeGroupOverrides,
      availableScopeTypes: normalizedAvailableScopeTypes,
    });
  }, [
    getPresetMatchedScopeUserIdsForSelection,
    hasConfigurablePermissionRoles,
    normalizedSelectedPermissionRole,
    scopeSelectionsByKey,
    selectionStateKey,
    scopeGroupKey,
    selectableScopeUserIdSet,
    selectedRoleDefaultScopeTypes,
    normalizedAvailableScopeTypes,
    scopeGroupOverrides,
  ]);

  const updateCurrentRoleSelection = useCallback((
    updater: (current: RoleScopeSelection) => RoleScopeSelection,
  ) => {
    if (!hasConfigurablePermissionRoles) {
      return;
    }

    let changedSelection: RoleScopeSelection | null = null;
    setScopeSelectionsByKey((currentSelections) => {
      const currentSelection = resolveRoleScopeSelection({
        cachedSelection: currentSelections[selectionStateKey],
        getPresetMatchedScopeUserIdsForSelection,
        scopeGroupKey,
        roleCode: normalizedSelectedPermissionRole,
        selectableScopeUserIdSet,
        selectedRoleDefaultScopeTypes,
        scopeGroupOverrides,
        availableScopeTypes: normalizedAvailableScopeTypes,
      });
      const nextSelection = syncRoleScopeSelection({
        getPresetMatchedScopeUserIdsForSelection,
        selectableScopeUserIdSet,
        selection: updater(currentSelection),
        availableScopeTypes: normalizedAvailableScopeTypes,
      });

      if (
        currentSelections[selectionStateKey]
        && sameScopeTypes(currentSelections[selectionStateKey].scopeTypes, nextSelection.scopeTypes)
        && sameScopeUserIds(currentSelections[selectionStateKey].scopeUserIds, nextSelection.scopeUserIds)
      ) {
        return currentSelections;
      }

      changedSelection = nextSelection;

      return {
        ...currentSelections,
        [selectionStateKey]: nextSelection,
      };
    });
    if (changedSelection) {
      void onSelectionChange?.(changedSelection);
    }
  }, [
    getPresetMatchedScopeUserIdsForSelection,
    hasConfigurablePermissionRoles,
    normalizedSelectedPermissionRole,
    onSelectionChange,
    selectionStateKey,
    scopeGroupKey,
    selectableScopeUserIdSet,
    selectedRoleDefaultScopeTypes,
    normalizedAvailableScopeTypes,
    scopeGroupOverrides,
  ]);

  const selectedPermissionScopes = currentRoleSelection.scopeTypes;
  const selectedScopeUserIds = currentRoleSelection.scopeUserIds;
  const formatScopeSummaryForDisplay = useCallback((
    scopeTypes: PermissionOverrideScope[],
    scopeUserIds: number[] = [],
  ) => formatScopeSummaryForDisplayValue({
    departments,
    getPresetMatchedScopeUserIdsForSelection,
    scopeTypes,
    scopeUserIds,
    selectableScopeUsers,
    selectedDepartmentName,
  }), [
    departments,
    getPresetMatchedScopeUserIdsForSelection,
    selectableScopeUsers,
    selectedDepartmentName,
  ]);
  const scopeFilterOptions = useMemo<ScopeFilterOption[]>(() => {
    const selectableDepartmentIds = new Set(
      selectableScopeUsers.map((scopeUser) => scopeUser.department?.id).filter((value): value is number => Boolean(value)),
    );

    return [
      { value: 'all', label: '全部' },
      { value: 'mentees', label: shouldRestrictToStudents ? '学生' : '名下' },
      ...departments
        .filter((department) => selectableDepartmentIds.has(department.id))
        .map((department) => ({ value: `dept_${department.id}`, label: department.name })),
    ];
  }, [departments, selectableScopeUsers, shouldRestrictToStudents]);
  const filteredScopeUsers = useMemo<UserList[]>(() => {
    const keyword = scopeUserSearch.trim().toLowerCase();

    return selectableScopeUsers.filter((scopeUser) => {
      if (scopeUserFilter === 'mentees' && (ownerUserId == null || scopeUser.mentor?.id !== ownerUserId)) {
        return false;
      }
      if (scopeUserFilter !== 'all' && scopeUserFilter !== 'mentees') {
        const filterDepartmentId = Number(scopeUserFilter.replace('dept_', ''));
        if (scopeUser.department?.id !== filterDepartmentId) {
          return false;
        }
      }
      if (!keyword) {
        return true;
      }

      return (
        scopeUser.username.toLowerCase().includes(keyword)
        || scopeUser.employee_id.toLowerCase().includes(keyword)
      );
    });
  }, [ownerUserId, scopeUserFilter, scopeUserSearch, selectableScopeUsers]);
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

  const handleScopeFilterChange = (filterValue: string) => {
    setScopeUserFilter(scopeUserFilter === filterValue ? 'all' : filterValue);
  };

  const toggleSelectAllFilteredScopeUsers = () => {
    if (!canSelectExplicitScopeUsers) {
      return;
    }
    if (filteredScopeUserIds.length === 0) {
      return;
    }

    updateCurrentRoleSelection((currentSelection) => {
      const nextUserIdSet = new Set(currentSelection.scopeUserIds);
      const shouldUnselectAll = filteredScopeUserIds.every((scopeUserId) => nextUserIdSet.has(scopeUserId));

      if (shouldUnselectAll) {
        filteredScopeUserIds.forEach((scopeUserId) => nextUserIdSet.delete(scopeUserId));
      } else {
        filteredScopeUserIds.forEach((scopeUserId) => nextUserIdSet.add(scopeUserId));
      }

      return {
        scopeTypes: currentSelection.scopeTypes.includes('EXPLICIT_USERS')
          ? currentSelection.scopeTypes
          : normalizeScopeTypes([...currentSelection.scopeTypes, 'EXPLICIT_USERS']),
        scopeUserIds: Array.from(nextUserIdSet).sort((left, right) => left - right),
      };
    });
  };

  const applyDefaultScopePreset = () => {
    updateCurrentRoleSelection(() => ({
      scopeTypes: normalizeScopeTypes(selectedRoleDefaultScopeTypes),
      scopeUserIds: getPresetMatchedScopeUserIdsForSelection(selectedRoleDefaultScopeTypes),
    }));
    setScopeUserSearch('');
  };

  const selectPresetScope = (scopeType: PermissionOverrideScope) => {
    updateCurrentRoleSelection(() => ({
      scopeTypes: normalizeScopeTypes([scopeType]),
      scopeUserIds: getPresetMatchedScopeUserIdsForSelection([scopeType]),
    }));
    setScopeUserSearch('');
  };

  const toggleScopeUser = (scopeUserId: number) => {
    if (!canSelectExplicitScopeUsers) {
      return;
    }
    updateCurrentRoleSelection((currentSelection) => ({
      ...currentSelection,
      scopeUserIds: currentSelection.scopeUserIds.includes(scopeUserId)
        ? currentSelection.scopeUserIds.filter((id) => id !== scopeUserId)
        : [...currentSelection.scopeUserIds, scopeUserId],
    }));
  };

  const ensureExplicitUsersScopeSelected = () => {
    if (!canSelectExplicitScopeUsers) {
      return;
    }
    if (selectedPermissionScopes.includes('EXPLICIT_USERS')) {
      return;
    }

    updateCurrentRoleSelection((currentSelection) => ({
      ...currentSelection,
      scopeTypes: normalizeScopeTypes([...currentSelection.scopeTypes, 'EXPLICIT_USERS']),
    }));
  };

  return {
    selectedPermissionScopes,
    selectedScopeUserIds,
    scopeUserSearch,
    showScopeAdjustPanel,
    scopeUserFilter,
    scopeFilterOptions,
    filteredScopeUsers,
    selectedFilteredScopeCount,
    isAllFilteredScopeUsersSelected,
    hasPartialFilteredScopeSelection,
    availableScopeTypes: normalizedAvailableScopeTypes,
    setShowScopeAdjustPanel,
    setScopeUserSearch,
    setScopeUserFilter,
    formatScopeSummaryForDisplay,
    handleScopeFilterChange,
    toggleSelectAllFilteredScopeUsers,
    applyDefaultScopePreset,
    selectPresetScope,
    toggleScopeUser,
    ensureExplicitUsersScopeSelected,
  };
};
