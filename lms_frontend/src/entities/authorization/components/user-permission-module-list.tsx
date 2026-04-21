import type { PermissionCatalogItem, PermissionOverrideScope } from '@/types/authorization';
import type { UserList } from '@/types/common';
import { PermissionModuleSections } from '@/entities/authorization/components/permission-module-sections';
import { PermissionToggleCard } from '@/entities/authorization/components/permission-toggle-card';
import { UserPermissionScopePopover } from './user-permission-scope-popover';
import { sameScopeTypes } from './user-form.utils';
import type { PermissionState, ScopeFilterOption } from './user-permission-section.types';

interface UserPermissionModuleSectionItem {
  module: string;
  permissions: PermissionCatalogItem[];
  scopeGroupKey: string | null;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  scopeSummary: string | null;
}

interface UserPermissionModuleListProps {
  activeScopeSection: UserPermissionModuleSectionItem | null;
  availableScopeTypes: PermissionOverrideScope[];
  dialogContentElement: HTMLDivElement | null;
  filteredScopeUsers: UserList[];
  formatScopeSummaryForDisplay: (
    scopeTypes: PermissionOverrideScope[],
    scopeUserIds?: number[],
  ) => string;
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (permissionCode: string, nextChecked: boolean) => void;
  handleScopeFilterChange: (filterValue: string) => void;
  hasPartialFilteredScopeSelection: boolean;
  isAllFilteredScopeUsersSelected: boolean;
  isExplicitUsersScopeSelected: boolean;
  isPermissionSaving: (permissionCode: string) => boolean;
  isScopeUsersLoading: boolean;
  moduleSections: UserPermissionModuleSectionItem[];
  onApplyDefaultScopePreset: () => void;
  onEnsureExplicitUsersScopeSelected: () => void;
  onOpenScopeGroupChange: (scopeGroupKey: string | null) => void;
  onScopeUserSearchChange: (value: string) => void;
  onSelectPresetScope: (scopeType: PermissionOverrideScope) => void;
  onSetScopeUserFilter: (value: string) => void;
  onSetShowScopeAdjustPanel: (open: boolean) => void;
  onToggleScopeUser: (scopeUserId: number) => void;
  onToggleSelectAllFilteredScopeUsers: () => void;
  openScopeGroupKey: string | null;
  scopeFilterOptions: ScopeFilterOption[];
  scopeUserFilter: string;
  scopeUserSearch: string;
  selectedFilteredScopeCount: number;
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
  showScopeAdjustPanel: boolean;
}

export function UserPermissionModuleList({
  activeScopeSection,
  availableScopeTypes,
  dialogContentElement,
  filteredScopeUsers,
  formatScopeSummaryForDisplay,
  getPermissionState,
  handlePermissionToggle,
  handleScopeFilterChange,
  hasPartialFilteredScopeSelection,
  isAllFilteredScopeUsersSelected,
  isExplicitUsersScopeSelected,
  isPermissionSaving,
  isScopeUsersLoading,
  moduleSections,
  onApplyDefaultScopePreset,
  onEnsureExplicitUsersScopeSelected,
  onOpenScopeGroupChange,
  onScopeUserSearchChange,
  onSelectPresetScope,
  onSetScopeUserFilter,
  onSetShowScopeAdjustPanel,
  onToggleScopeUser,
  onToggleSelectAllFilteredScopeUsers,
  openScopeGroupKey,
  scopeFilterOptions,
  scopeUserFilter,
  scopeUserSearch,
  selectedFilteredScopeCount,
  selectedPermissionScopes,
  selectedScopeUserIds,
  showScopeAdjustPanel,
}: UserPermissionModuleListProps) {
  return (
    <PermissionModuleSections
      sections={moduleSections.map((section) => ({
        module: section.module,
        permissions: section.permissions,
        sectionAction: section.scopeGroupKey ? (
          <div className="w-full lg:w-[220px]">
            <UserPermissionScopePopover
              open={showScopeAdjustPanel && openScopeGroupKey === section.scopeGroupKey}
              onOpenChange={(open) => {
                onOpenScopeGroupChange(open ? section.scopeGroupKey : null);
                onSetShowScopeAdjustPanel(open);
              }}
              summary={
                openScopeGroupKey === section.scopeGroupKey
                  ? formatScopeSummaryForDisplay(selectedPermissionScopes, selectedScopeUserIds)
                  : (section.scopeSummary ?? '设置范围')
              }
              scopeFilterOptions={scopeFilterOptions}
              availableScopeTypes={availableScopeTypes}
              selectedPermissionScopes={selectedPermissionScopes}
              onSelectPresetScope={onSelectPresetScope}
              scopeUserFilter={scopeUserFilter}
              onScopeFilterChange={handleScopeFilterChange}
              showReset={openScopeGroupKey === section.scopeGroupKey
                && !sameScopeTypes(
                  selectedPermissionScopes,
                  activeScopeSection?.selectedRoleDefaultScopeTypes ?? [],
                )}
              onReset={() => {
                onApplyDefaultScopePreset();
                onSetScopeUserFilter('all');
              }}
              scopeUserSearch={scopeUserSearch}
              onScopeUserSearchChange={onScopeUserSearchChange}
              isAllFilteredScopeUsersSelected={isAllFilteredScopeUsersSelected}
              hasPartialFilteredScopeSelection={hasPartialFilteredScopeSelection}
              onToggleSelectAllFilteredScopeUsers={onToggleSelectAllFilteredScopeUsers}
              selectedFilteredScopeCount={selectedFilteredScopeCount}
              filteredScopeUsers={filteredScopeUsers}
              selectedScopeUserIds={selectedScopeUserIds}
              onToggleScopeUser={onToggleScopeUser}
              isExplicitUsersScopeSelected={isExplicitUsersScopeSelected}
              onEnsureExplicitUsersScopeSelected={onEnsureExplicitUsersScopeSelected}
              isScopeUsersLoading={isScopeUsersLoading}
              dialogContentElement={dialogContentElement}
            />
          </div>
        ) : null,
      }))}
      renderPermissionCard={(permission) => {
        const permissionState = getPermissionState(permission.code);
        const disabled = Boolean(
          isPermissionSaving(permission.code)
          || (permissionState.checked
            ? permissionState.disableBlockedReason
            : permissionState.enableBlockedReason),
        );

        return (
          <PermissionToggleCard
            key={permission.code}
            permission={permission}
            checked={permissionState.checked}
            disabled={disabled}
            isSaving={isPermissionSaving(permission.code)}
            onToggle={(nextChecked) => { handlePermissionToggle(permission.code, nextChecked); }}
          />
        );
      }}
    />
  );
}
