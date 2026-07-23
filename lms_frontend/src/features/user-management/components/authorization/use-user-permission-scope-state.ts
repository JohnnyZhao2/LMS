import { useCallback, useMemo, useState } from 'react';

import type { ScopeType } from '@/types/authorization';
import type {
  Department,
  UserList,
  UserList as UserDetail,
} from '@/types/common';

import {
  sameScopeType,
  sameScopeUserIds,
} from '@/features/user-management/components/authorization/user-form.utils';
import {
  formatScopeSummaryForDisplay as formatScopeSummaryForDisplayValue,
  getPresetMatchedScopeUserIds,
  getSelectableScopeUsers,
  normalizeAvailableScopeTypes,
  normalizeScopeUserIds,
  syncRoleScopeSelection,
} from '@/features/user-management/components/authorization/user-permission-scope.utils';
import type {
  RoleScopeSelection,
  ScopeFilterOption,
} from '@/features/user-management/components/authorization/user-permission-scope.utils';

interface UseUserPermissionScopeStateParams {
  userId?: number;
  userDetail?: UserDetail;
  departments: Department[];
  departmentId?: number;
  selectedDepartmentName?: string;
  hasConfigurablePermissionRoles: boolean;
  availableScopeTypes: ScopeType[];
  defaultScopeType: ScopeType | null;
  scopeUsers: UserList[];
  currentSelection: RoleScopeSelection;
  onSelectionChange?: (selection: RoleScopeSelection) => void;
}

interface UseUserPermissionScopeStateResult {
  selectedScopeType: ScopeType | null;
  selectedScopeUserIds: number[];
  scopeUserSearch: string;
  showScopeAdjustPanel: boolean;
  scopeUserFilter: string;
  scopeFilterOptions: ScopeFilterOption[];
  filteredScopeUsers: UserList[];
  setShowScopeAdjustPanel: (open: boolean) => void;
  setScopeUserSearch: (value: string) => void;
  setScopeUserFilter: (value: string) => void;
  formatScopeSummaryForDisplay: (
    scopeType: ScopeType | null,
    targetUserIds?: number[],
  ) => string;
  handleScopeFilterChange: (filterValue: string) => void;
  toggleSelectAllFilteredScopeUsers: () => void;
  applyDefaultScopePreset: () => void;
  selectPresetScope: (scopeType: ScopeType) => void;
  toggleScopeUser: (scopeUserId: number) => void;
}

/**
 * 范围弹窗本地交互状态；变更立刻写回并持久化。
 */
export const useUserPermissionScopeState = ({
  userId,
  userDetail,
  departments,
  departmentId,
  selectedDepartmentName,
  hasConfigurablePermissionRoles,
  availableScopeTypes,
  defaultScopeType,
  scopeUsers,
  currentSelection,
  onSelectionChange,
}: UseUserPermissionScopeStateParams): UseUserPermissionScopeStateResult => {
  const [scopeUserSearch, setScopeUserSearch] = useState('');
  const [showScopeAdjustPanel, setShowScopeAdjustPanel] = useState(false);
  const [scopeUserFilter, setScopeUserFilter] = useState<string>('all');
  const normalizedAvailableScopeTypes = useMemo(
    () => normalizeAvailableScopeTypes(availableScopeTypes),
    [availableScopeTypes],
  );
  const canSelectExplicitScopeUsers =
    normalizedAvailableScopeTypes.includes('EXPLICIT_USERS');
  const ownerUserId = userId ?? userDetail?.id ?? null;
  const ownerDepartmentId = departmentId ?? userDetail?.department?.id ?? null;
  const selectableScopeUsers = useMemo(
    () => getSelectableScopeUsers(scopeUsers),
    [scopeUsers],
  );
  const selectableScopeUserIdSet = useMemo(
    () => new Set(selectableScopeUsers.map((scopeUser) => scopeUser.id)),
    [selectableScopeUsers],
  );

  const syncedSelection = useMemo(
    () =>
      syncRoleScopeSelection({
        selection: currentSelection,
        selectableScopeUserIdSet,
        availableScopeTypes: normalizedAvailableScopeTypes,
      }),
    [currentSelection, normalizedAvailableScopeTypes, selectableScopeUserIdSet],
  );

  const updateSelection = useCallback(
    (updater: (current: RoleScopeSelection) => RoleScopeSelection) => {
      if (!hasConfigurablePermissionRoles) {
        return;
      }

      const nextSelection = syncRoleScopeSelection({
        selection: updater(syncedSelection),
        selectableScopeUserIdSet,
        availableScopeTypes: normalizedAvailableScopeTypes,
      });

      if (
        sameScopeType(syncedSelection.scopeType, nextSelection.scopeType)
        && sameScopeUserIds(
          syncedSelection.targetUserIds,
          nextSelection.targetUserIds,
        )
      ) {
        return;
      }

      onSelectionChange?.(nextSelection);
    },
    [
      hasConfigurablePermissionRoles,
      normalizedAvailableScopeTypes,
      onSelectionChange,
      selectableScopeUserIdSet,
      syncedSelection,
    ],
  );

  const selectedScopeType = syncedSelection.scopeType;
  const getPresetMatchedIds = useCallback(
    (scopeType: ScopeType | null) =>
      getPresetMatchedScopeUserIds({
        departmentId: ownerDepartmentId,
        scopeType,
        selectableScopeUsers,
        userId: ownerUserId,
      }),
    [ownerDepartmentId, ownerUserId, selectableScopeUsers],
  );
  /** 勾选展示用：预设范围展开为匹配用户，指定人员用 targetUserIds */
  const selectedScopeUserIds = useMemo(() => {
    if (syncedSelection.scopeType === 'EXPLICIT_USERS') {
      return syncedSelection.targetUserIds;
    }
    return getPresetMatchedIds(syncedSelection.scopeType);
  }, [getPresetMatchedIds, syncedSelection]);
  const formatScopeSummaryForDisplay = useCallback(
    (scopeType: ScopeType | null, targetUserIds: number[] = []) =>
      formatScopeSummaryForDisplayValue({
        departments,
        scopeType,
        targetUserIds,
        selectableScopeUsers,
        selectedDepartmentName,
      }),
    [
      departments,
      selectableScopeUsers,
      selectedDepartmentName,
    ],
  );
  const scopeFilterOptions = useMemo<ScopeFilterOption[]>(() => {
    const selectableDepartmentIds = new Set(
      selectableScopeUsers
        .map((scopeUser) => scopeUser.department?.id)
        .filter((value): value is number => Boolean(value)),
    );

    return [
      { value: 'all', label: '全部' },
      { value: 'mentees', label: '学生' },
      ...departments
        .filter((department) => selectableDepartmentIds.has(department.id))
        .map((department) => ({
          value: `dept_${department.id}`,
          label: department.name,
        })),
    ];
  }, [departments, selectableScopeUsers]);
  const getScopeUsersByFilter = useCallback(
    (filterValue: string) =>
      selectableScopeUsers.filter((scopeUser) => {
        if (filterValue === 'all') return true;
        if (filterValue === 'mentees')
          return ownerUserId != null && scopeUser.mentor?.id === ownerUserId;
        return (
          scopeUser.department?.id === Number(filterValue.replace('dept_', ''))
        );
      }),
    [ownerUserId, selectableScopeUsers],
  );
  const filteredScopeUsers = useMemo<UserList[]>(() => {
    const keyword = scopeUserSearch.trim().toLowerCase();

    return getScopeUsersByFilter(scopeUserFilter).filter(
      (scopeUser) =>
        !keyword
        || scopeUser.username.toLowerCase().includes(keyword)
        || scopeUser.employee_id.toLowerCase().includes(keyword),
    );
  }, [getScopeUsersByFilter, scopeUserFilter, scopeUserSearch]);
  const explicitSelection = (targetUserIds: number[]): RoleScopeSelection => ({
    scopeType: 'EXPLICIT_USERS',
    targetUserIds,
  });
  const resolveEffectiveUserIds = useCallback(
    (selection: RoleScopeSelection) => {
      if (selection.scopeType === 'EXPLICIT_USERS') {
        return selection.targetUserIds;
      }
      return getPresetMatchedIds(selection.scopeType);
    },
    [getPresetMatchedIds],
  );
  const getScopeSelectionByFilterValue = useCallback(
    (filterValue: string): RoleScopeSelection => {
      if (
        filterValue === 'all'
        && normalizedAvailableScopeTypes.includes('ALL')
      ) {
        return { scopeType: 'ALL', targetUserIds: [] };
      }

      if (
        filterValue === 'mentees'
        && normalizedAvailableScopeTypes.includes('MENTEES')
      ) {
        return { scopeType: 'MENTEES', targetUserIds: [] };
      }

      if (filterValue.startsWith('dept_')) {
        const filterDepartmentId = Number(filterValue.replace('dept_', ''));
        if (
          ownerDepartmentId === filterDepartmentId
          && normalizedAvailableScopeTypes.includes('DEPARTMENT')
        ) {
          return { scopeType: 'DEPARTMENT', targetUserIds: [] };
        }
      }

      return explicitSelection(
        normalizeScopeUserIds(
          getScopeUsersByFilter(filterValue).map((scopeUser) => scopeUser.id),
        ),
      );
    },
    [
      getScopeUsersByFilter,
      normalizedAvailableScopeTypes,
      ownerDepartmentId,
    ],
  );
  const filteredScopeUserIds = useMemo(
    () => filteredScopeUsers.map((scopeUser) => scopeUser.id),
    [filteredScopeUsers],
  );
  const handleScopeFilterChange = (filterValue: string) => {
    setScopeUserFilter(filterValue);
  };

  const toggleSelectAllFilteredScopeUsers = () => {
    if (!canSelectExplicitScopeUsers) {
      return;
    }
    if (filteredScopeUserIds.length === 0) {
      return;
    }

    updateSelection((currentSelection) => {
      const nextUserIdSet = new Set(resolveEffectiveUserIds(currentSelection));
      const shouldUnselectAll = filteredScopeUserIds.every((scopeUserId) =>
        nextUserIdSet.has(scopeUserId),
      );

      if (shouldUnselectAll) {
        filteredScopeUserIds.forEach((scopeUserId) =>
          nextUserIdSet.delete(scopeUserId),
        );
        return explicitSelection(
          normalizeScopeUserIds(Array.from(nextUserIdSet)),
        );
      }

      const nextSelection = getScopeSelectionByFilterValue(scopeUserFilter);
      if (
        sameScopeUserIds(
          resolveEffectiveUserIds(nextSelection),
          filteredScopeUserIds,
        )
      ) {
        return nextSelection;
      }

      filteredScopeUserIds.forEach((scopeUserId) =>
        nextUserIdSet.add(scopeUserId),
      );
      return explicitSelection(
        normalizeScopeUserIds(Array.from(nextUserIdSet)),
      );
    });
  };

  const applyDefaultScopePreset = () => {
    if (!defaultScopeType) {
      return;
    }
    updateSelection(() => ({
      scopeType: defaultScopeType,
      targetUserIds: [],
    }));
    setScopeUserSearch('');
  };

  const selectPresetScope = (scopeType: ScopeType) => {
    updateSelection(() => ({
      scopeType,
      targetUserIds: [],
    }));
    setScopeUserSearch('');
  };

  const toggleScopeUser = (scopeUserId: number) => {
    if (!canSelectExplicitScopeUsers) {
      return;
    }
    updateSelection((currentSelection) => {
      const nextUserIdSet = new Set(resolveEffectiveUserIds(currentSelection));
      if (nextUserIdSet.has(scopeUserId)) {
        nextUserIdSet.delete(scopeUserId);
      } else {
        nextUserIdSet.add(scopeUserId);
      }

      return explicitSelection(
        normalizeScopeUserIds(Array.from(nextUserIdSet)),
      );
    });
  };

  return {
    selectedScopeType,
    selectedScopeUserIds,
    scopeUserSearch,
    showScopeAdjustPanel,
    scopeUserFilter,
    scopeFilterOptions,
    filteredScopeUsers,
    setShowScopeAdjustPanel,
    setScopeUserSearch,
    setScopeUserFilter,
    formatScopeSummaryForDisplay,
    handleScopeFilterChange,
    toggleSelectAllFilteredScopeUsers,
    applyDefaultScopePreset,
    selectPresetScope,
    toggleScopeUser,
  };
};
