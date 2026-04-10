import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import type { PermissionOverrideScope, UserPermissionOverride } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import type { Department, UserList, UserList as UserDetail } from '@/types/common';

import { normalizeScopeTypes, sameScopeTypes, sameScopeUserIds } from './user-form.utils';
import type { ScopeFilterOption } from './user-permission-section.types';
import {
  formatScopeSummaryForDisplay as formatScopeSummaryForDisplayValue,
  getPresetMatchedScopeUserIds,
  getSelectableScopeUsers,
  resolveRoleScopeSelection,
  STUDENT_ONLY_SCOPE_PERMISSION_CODES,
  syncRoleScopeSelection,
} from './user-permission-scope.utils';
import type { RoleScopeSelection } from './user-permission-scope.utils';

interface UseUserPermissionScopeStateParams {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  departmentId?: number;
  selectedDepartmentName?: string;
  hasConfigurablePermissionRoles: boolean;
  normalizedSelectedPermissionRole: RoleCode;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  scopePermissionCode?: string | null;
  scopeUsers: UserList[];
  userOverrides: UserPermissionOverride[];
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
  scopePermissionCode,
  scopeUsers,
  userOverrides,
}: UseUserPermissionScopeStateParams): UseUserPermissionScopeStateResult => {
  const [scopeSelectionsByKey, setScopeSelectionsByKey] = useState<Record<string, RoleScopeSelection>>({});
  const [scopeUserSearch, setScopeUserSearch] = useState('');
  const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
  const [scopeUserFilter, setScopeUserFilter] = useState<string>('all');
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
    () => `${ownerUserId ?? 'new'}:${normalizedSelectedPermissionRole}`,
    [normalizedSelectedPermissionRole, ownerUserId],
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
      roleCode: normalizedSelectedPermissionRole,
      selectableScopeUserIdSet,
      selectedRoleDefaultScopeTypes,
      userOverrides,
    });
  }, [
    getPresetMatchedScopeUserIdsForSelection,
    hasConfigurablePermissionRoles,
    normalizedSelectedPermissionRole,
    scopeSelectionsByKey,
    selectionStateKey,
    selectableScopeUserIdSet,
    selectedRoleDefaultScopeTypes,
    userOverrides,
  ]);

  const updateCurrentRoleSelection = useCallback((
    updater: (current: RoleScopeSelection) => RoleScopeSelection,
  ) => {
    if (!hasConfigurablePermissionRoles) {
      return;
    }

    setScopeSelectionsByKey((currentSelections) => {
      const currentSelection = resolveRoleScopeSelection({
        cachedSelection: currentSelections[selectionStateKey],
        getPresetMatchedScopeUserIdsForSelection,
        roleCode: normalizedSelectedPermissionRole,
        selectableScopeUserIdSet,
        selectedRoleDefaultScopeTypes,
        userOverrides,
      });
      const nextSelection = syncRoleScopeSelection({
        getPresetMatchedScopeUserIdsForSelection,
        selectableScopeUserIdSet,
        selection: updater(currentSelection),
      });

      if (
        currentSelections[selectionStateKey]
        && sameScopeTypes(currentSelections[selectionStateKey].scopeTypes, nextSelection.scopeTypes)
        && sameScopeUserIds(currentSelections[selectionStateKey].scopeUserIds, nextSelection.scopeUserIds)
      ) {
        return currentSelections;
      }

      return {
        ...currentSelections,
        [selectionStateKey]: nextSelection,
      };
    });
  }, [
    getPresetMatchedScopeUserIdsForSelection,
    hasConfigurablePermissionRoles,
    normalizedSelectedPermissionRole,
    selectionStateKey,
    selectableScopeUserIdSet,
    selectedRoleDefaultScopeTypes,
    userOverrides,
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

  const toggleScopeUser = (scopeUserId: number) => {
    updateCurrentRoleSelection((currentSelection) => ({
      ...currentSelection,
      scopeUserIds: currentSelection.scopeUserIds.includes(scopeUserId)
        ? currentSelection.scopeUserIds.filter((id) => id !== scopeUserId)
        : [...currentSelection.scopeUserIds, scopeUserId],
    }));
  };

  const ensureExplicitUsersScopeSelected = () => {
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
    setShowScopeAdjustPanel,
    setScopeUserSearch,
    setScopeUserFilter,
    formatScopeSummaryForDisplay,
    handleScopeFilterChange,
    toggleSelectAllFilteredScopeUsers,
    applyDefaultScopePreset,
    toggleScopeUser,
    ensureExplicitUsersScopeSelected,
  };
};
