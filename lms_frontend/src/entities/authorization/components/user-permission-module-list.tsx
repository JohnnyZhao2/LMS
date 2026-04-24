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
  scopeGroups: UserPermissionScopeGroupItem[];
}

interface UserPermissionScopeGroupItem {
  key: string;
  selectedRoleDefaultScopeTypes: PermissionOverrideScope[];
  scopeSummary: string;
}

interface UserPermissionModuleListProps {
  activeScopeGroup: UserPermissionScopeGroupItem | null;
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
  isPermissionSaving: (permissionCode: string) => boolean;
  isScopeUsersLoading: boolean;
  moduleSections: UserPermissionModuleSectionItem[];
  onApplyDefaultScopePreset: () => void;
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
  activeScopeGroup,
  availableScopeTypes,
  dialogContentElement,
  filteredScopeUsers,
  formatScopeSummaryForDisplay,
  getPermissionState,
  handlePermissionToggle,
  handleScopeFilterChange,
  hasPartialFilteredScopeSelection,
  isAllFilteredScopeUsersSelected,
  isPermissionSaving,
  isScopeUsersLoading,
  moduleSections,
  onApplyDefaultScopePreset,
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
  const getScopeGroupLabel = (scopeGroupKey: string) => (
    scopeGroupKey.endsWith('_resource_scope') ? '数据范围' : '作用范围'
  );

  return (
    <PermissionModuleSections
      sections={moduleSections.map((section) => ({
        module: section.module,
        permissions: section.permissions,
        sectionAction: section.scopeGroups.length > 0 ? (
          <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:justify-end">
            {section.scopeGroups.map((scopeGroup) => (
              <div key={scopeGroup.key} className="flex min-w-[210px] items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold text-slate-500">
                  {getScopeGroupLabel(scopeGroup.key)}
                </span>
                <div className="min-w-0 flex-1">
                  <UserPermissionScopePopover
                    open={showScopeAdjustPanel && openScopeGroupKey === scopeGroup.key}
                    onOpenChange={(open) => {
                      onOpenScopeGroupChange(open ? scopeGroup.key : null);
                      onSetShowScopeAdjustPanel(open);
                    }}
                    summary={
                      openScopeGroupKey === scopeGroup.key
                        ? formatScopeSummaryForDisplay(selectedPermissionScopes, selectedScopeUserIds)
                        : scopeGroup.scopeSummary
                    }
                    scopeFilterOptions={scopeFilterOptions}
                    availableScopeTypes={availableScopeTypes}
                    selectedPermissionScopes={selectedPermissionScopes}
                    onSelectPresetScope={onSelectPresetScope}
                    scopeUserFilter={scopeUserFilter}
                    onScopeFilterChange={handleScopeFilterChange}
                    showReset={openScopeGroupKey === scopeGroup.key
                      && !sameScopeTypes(
                        selectedPermissionScopes,
                        activeScopeGroup?.selectedRoleDefaultScopeTypes ?? [],
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
                    isScopeUsersLoading={isScopeUsersLoading}
                    dialogContentElement={dialogContentElement}
                  />
                </div>
              </div>
            ))}
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
